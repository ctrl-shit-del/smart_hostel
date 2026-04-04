const express = require('express');
const router = express.Router();
const { format, startOfWeek } = require('date-fns');
const { MessMenu, NightOrder, NightMessItem, MessAttendance, MessFeedback } = require('../models/Mess');
const Student = require('../models/Student');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin, isStudent, isStaff } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { DAYS, MEALS, MESS_TYPES, DEFAULT_WEEKLY_MENU, createMenuRecords } = require('../data/defaultMessMenu');
const { DEFAULT_NIGHT_MESS_ITEMS } = require('../data/defaultNightMessCatalog');
const { emitToUser } = require('../utils/socket');

const sortByCatalog = (list, value) => list.indexOf(value);

const normalizeMenuDoc = (menu) => ({
  _id: menu._id,
  day: menu.day,
  meal: menu.meal,
  mess_type: menu.mess_type,
  caterer: menu.caterer,
  menu_name: menu.menu_name,
  items: menu.items || [],
  nutrition: menu.nutrition || {},
  block_name: menu.block_name,
});

const buildDefaultWeekly = () => {
  const weekly = {};
  for (const day of DAYS) {
    weekly[day] = {};
    for (const messType of MESS_TYPES) {
      weekly[day][messType] = MEALS.map((meal) => ({
        day,
        meal,
        mess_type: messType,
        caterer: DEFAULT_WEEKLY_MENU[day][messType][meal].caterer,
        menu_name: DEFAULT_WEEKLY_MENU[day][messType][meal].name,
        items: DEFAULT_WEEKLY_MENU[day][messType][meal].items,
        nutrition: DEFAULT_WEEKLY_MENU[day][messType][meal].nutrition,
      }));
    }
  }
  return weekly;
};

const mergeWeeklyMenus = (dbMenus) => {
  const weekly = buildDefaultWeekly();

  for (const menu of dbMenus) {
    const dayMenus = weekly[menu.day] || {};
    const messTypeMenus = dayMenus[menu.mess_type] || [];
    const slot = messTypeMenus.findIndex((entry) => entry.meal === menu.meal);
    if (slot >= 0) {
      messTypeMenus[slot] = normalizeMenuDoc(menu);
    }
  }

  return weekly;
};

const getTodayMeta = () => ({
  dateKey: format(new Date(), 'yyyy-MM-dd'),
  dayName: format(new Date(), 'EEEE'),
});

const getMealWindow = (hour) => {
  const windows = [
    { meal: 'Breakfast', start: 7, end: 10, baseFill: 70 },
    { meal: 'Lunch', start: 12, end: 15, baseFill: 88 },
    { meal: 'Snacks', start: 16, end: 18, baseFill: 52 },
    { meal: 'Dinner', start: 19, end: 22, baseFill: 76 },
  ];

  return windows.find((window) => hour >= window.start && hour < window.end) || null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const averageRating = (feedback) => {
  const scores = [
    feedback.rating_taste,
    feedback.rating_quality,
    feedback.rating_quantity,
    feedback.rating_hygiene,
    feedback.rating_variety,
  ];
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
};

const ensureNightMenuCatalog = async (blockName, updatedBy = null) => {
  const existingCount = await NightMessItem.countDocuments({ block_name: blockName });
  if (existingCount > 0) {
    return NightMessItem.find({ block_name: blockName }).sort({ category: 1, name: 1 });
  }

  await NightMessItem.insertMany(
    DEFAULT_NIGHT_MESS_ITEMS.map((item) => ({
      ...item,
      block_name: blockName,
      updated_by: updatedBy,
    }))
  );

  return NightMessItem.find({ block_name: blockName }).sort({ category: 1, name: 1 });
};

const buildOrderNumber = () => `NM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

const notifyStudentOrderUpdate = (studentId, title, content) => {
  try {
    emitToUser(studentId, 'alert:new', { title, content });
  } catch (_err) {
    // Socket layer may be unavailable during local-only workflows.
  }
};

const toMealStatsMap = (records, totalStudents) => {
  return MEALS.reduce((acc, meal) => {
    const mealRecord = records.find((record) => record._id === meal);
    const ateCount = mealRecord?.ateCount || 0;
    const skippedCount = mealRecord?.skippedCount || 0;
    const respondedCount = ateCount + skippedCount;
    const pendingCount = Math.max(totalStudents - respondedCount, 0);
    const eatRate = respondedCount > 0 ? ateCount / respondedCount : 0.7;
    const projectedDemand = Math.min(totalStudents, Math.round(ateCount + (pendingCount * eatRate)));
    const recommendedPrep = Math.min(totalStudents, Math.ceil(projectedDemand * 1.05));
    const wasteRisk = recommendedPrep - ateCount > Math.max(8, Math.round(totalStudents * 0.12))
      ? 'High'
      : recommendedPrep - ateCount > Math.max(4, Math.round(totalStudents * 0.06))
        ? 'Moderate'
        : 'Low';

    acc[meal] = {
      meal,
      ateCount,
      skippedCount,
      respondedCount,
      pendingCount,
      attendanceRate: totalStudents > 0 ? Math.round((ateCount / totalStudents) * 100) : 0,
      responseRate: totalStudents > 0 ? Math.round((respondedCount / totalStudents) * 100) : 0,
      projectedDemand,
      recommendedPrep,
      wasteRisk,
    };
    return acc;
  }, {});
};

// GET /api/v1/mess/menu — today's menu
router.get('/menu', authenticate, asyncHandler(async (req, res) => {
  const { block, day } = req.query;
  const today = day || format(new Date(), 'EEEE');
  const blockName = block || req.user.block_name;

  const menu = await MessMenu.find({ block_name: blockName, day: today })
    .sort({ mess_type: 1, meal: 1 });

  const weekly = mergeWeeklyMenus(menu);
  res.json({ success: true, day: today, menu: weekly[today] || {}, block: blockName });
}));

// GET /api/v1/mess/menu/week — weekly menu
router.get('/menu/week', authenticate, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const blockName = block || req.user.block_name;
  const menu = await MessMenu.find({ block_name: blockName, day: { $in: DAYS } });

  menu.sort((a, b) => {
    const dayDiff = sortByCatalog(DAYS, a.day) - sortByCatalog(DAYS, b.day);
    if (dayDiff !== 0) return dayDiff;
    const typeDiff = sortByCatalog(MESS_TYPES, a.mess_type) - sortByCatalog(MESS_TYPES, b.mess_type);
    if (typeDiff !== 0) return typeDiff;
    return sortByCatalog(MEALS, a.meal) - sortByCatalog(MEALS, b.meal);
  });

  const weekly = mergeWeeklyMenus(menu);
  res.json({ success: true, block: blockName, weekly, days: DAYS, meals: MEALS, messTypes: MESS_TYPES });
}));

// GET /api/v1/mess/attendance/today — student mess attendance state
router.get('/attendance/today', authenticate, asyncHandler(async (req, res) => {
  const { dateKey, dayName } = getTodayMeta();
  const records = await MessAttendance.find({
    student_id: req.user._id,
    date_key: dateKey,
  }).sort({ meal: 1 });

  const attendance = MEALS.reduce((acc, meal) => {
    const record = records.find((entry) => entry.meal === meal);
    acc[meal] = record ? {
      status: record.status,
      mess_type: record.mess_type,
      recorded_at: record.recorded_at,
    } : null;
    return acc;
  }, {});

  const eatenCount = records.filter((record) => record.status === 'Ate').length;
  const skippedCount = records.filter((record) => record.status === 'Skipped').length;

  res.json({
    success: true,
    dateKey,
    day: dayName,
    attendance,
    summary: {
      eatenCount,
      skippedCount,
      respondedMeals: records.length,
      pendingMeals: Math.max(MEALS.length - records.length, 0),
    },
  });
}));

// POST /api/v1/mess/attendance/mark — student marks whether meal was eaten
router.post('/attendance/mark', authenticate, isStudent, asyncHandler(async (req, res) => {
  const { meal, status, mess_type } = req.body;
  if (!MEALS.includes(meal)) {
    return res.status(400).json({ success: false, message: 'Invalid meal selected.' });
  }
  if (!['Ate', 'Skipped'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be Ate or Skipped.' });
  }

  const { dateKey, dayName } = getTodayMeta();
  const attendance = await MessAttendance.findOneAndUpdate(
    { student_id: req.user._id, date_key: dateKey, meal },
    {
      student_id: req.user._id,
      block_name: req.user.block_name,
      date_key: dateKey,
      day: dayName,
      meal,
      mess_type: mess_type || req.user.mess || 'Veg',
      status,
      recorded_at: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, attendance });
}));

// GET /api/v1/mess/attendance/analytics — staff view of meal attendance and waste risk
router.get('/attendance/analytics', authenticate, isStaff, asyncHandler(async (req, res) => {
  const requestedDate = req.query.date || format(new Date(), 'yyyy-MM-dd');
  const dayName = format(new Date(requestedDate), 'EEEE');
  const blockName = req.query.block || req.user.block_name || 'A Block';
  const totalStudents = await Student.countDocuments({ block_name: blockName, is_active: { $ne: false } });

  const aggregated = await MessAttendance.aggregate([
    { $match: { block_name: blockName, date_key: requestedDate } },
    {
      $group: {
        _id: '$meal',
        ateCount: { $sum: { $cond: [{ $eq: ['$status', 'Ate'] }, 1, 0] } },
        skippedCount: { $sum: { $cond: [{ $eq: ['$status', 'Skipped'] }, 1, 0] } },
      },
    },
  ]);

  const historical = await MessAttendance.aggregate([
    {
      $match: {
        block_name: blockName,
        day: dayName,
      },
    },
    {
      $group: {
        _id: { meal: '$meal', date_key: '$date_key' },
        ateCount: { $sum: { $cond: [{ $eq: ['$status', 'Ate'] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: '$_id.meal',
        avgAteCount: { $avg: '$ateCount' },
      },
    },
  ]);

  const historicalMap = historical.reduce((acc, item) => {
    acc[item._id] = Math.round(item.avgAteCount || 0);
    return acc;
  }, {});

  const mealStats = toMealStatsMap(aggregated, totalStudents);
  for (const meal of MEALS) {
    mealStats[meal].historicalAverage = historicalMap[meal] || 0;
    if (mealStats[meal].historicalAverage > mealStats[meal].projectedDemand) {
      mealStats[meal].projectedDemand = Math.min(totalStudents, mealStats[meal].historicalAverage);
      mealStats[meal].recommendedPrep = Math.min(totalStudents, Math.ceil(mealStats[meal].projectedDemand * 1.05));
    }
  }

  res.json({
    success: true,
    block: blockName,
    date: requestedDate,
    totalStudents,
    meals: mealStats,
    totals: {
      ateCount: Object.values(mealStats).reduce((sum, meal) => sum + meal.ateCount, 0),
      skippedCount: Object.values(mealStats).reduce((sum, meal) => sum + meal.skippedCount, 0),
    },
  });
}));

// GET /api/v1/mess/feedback/today — student feedback state for today
router.get('/feedback/today', authenticate, isStudent, asyncHandler(async (req, res) => {
  const { dateKey } = getTodayMeta();
  const feedback = await MessFeedback.find({
    student_id: req.user._id,
    date_key: dateKey,
  }).sort({ meal: 1 });

  const byMeal = feedback.reduce((acc, item) => {
    acc[item.meal] = {
      meal: item.meal,
      mess_type: item.mess_type,
      menu_name: item.menu_name,
      comment: item.comment,
      rating_taste: item.rating_taste,
      rating_quality: item.rating_quality,
      rating_quantity: item.rating_quantity,
      rating_hygiene: item.rating_hygiene,
      rating_variety: item.rating_variety,
    };
    return acc;
  }, {});

  res.json({ success: true, feedback: byMeal });
}));

// POST /api/v1/mess/feedback — anonymous feedback from student
router.post('/feedback', authenticate, isStudent, asyncHandler(async (req, res) => {
  const {
    meal,
    mess_type,
    menu_name,
    rating_taste,
    rating_quality,
    rating_quantity,
    rating_hygiene,
    rating_variety,
    comment = '',
  } = req.body;

  if (!MEALS.includes(meal) || !MESS_TYPES.includes(mess_type)) {
    return res.status(400).json({ success: false, message: 'Invalid meal or mess type.' });
  }

  const ratings = [rating_taste, rating_quality, rating_quantity, rating_hygiene, rating_variety].map(Number);
  if (ratings.some((value) => !value || value < 1 || value > 5)) {
    return res.status(400).json({ success: false, message: 'All ratings must be between 1 and 5.' });
  }

  const { dateKey, dayName } = getTodayMeta();
  const feedback = await MessFeedback.findOneAndUpdate(
    { student_id: req.user._id, date_key: dateKey, meal },
    {
      student_id: req.user._id,
      block_name: req.user.block_name,
      date_key: dateKey,
      day: dayName,
      meal,
      mess_type,
      menu_name,
      rating_taste: ratings[0],
      rating_quality: ratings[1],
      rating_quantity: ratings[2],
      rating_hygiene: ratings[3],
      rating_variety: ratings[4],
      comment: comment.trim(),
      is_anonymous: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, feedback: { meal: feedback.meal, average_rating: averageRating(feedback) } });
}));

// GET /api/v1/mess/feedback/analytics — anonymized staff insights
router.get('/feedback/analytics', authenticate, isStaff, asyncHandler(async (req, res) => {
  const requestedDate = req.query.date || format(new Date(), 'yyyy-MM-dd');
  const blockName = req.query.block || req.user.block_name || 'A Block';

  const feedbackDocs = await MessFeedback.find({ block_name: blockName, date_key: requestedDate })
    .sort({ createdAt: -1 })
    .lean();

  const mealStats = MEALS.reduce((acc, meal) => {
    const items = feedbackDocs.filter((doc) => doc.meal === meal);
    const count = items.length;
    const avg = (field) => count ? Number((items.reduce((sum, item) => sum + (item[field] || 0), 0) / count).toFixed(1)) : 0;
    acc[meal] = {
      count,
      avgTaste: avg('rating_taste'),
      avgQuality: avg('rating_quality'),
      avgQuantity: avg('rating_quantity'),
      avgHygiene: avg('rating_hygiene'),
      avgVariety: avg('rating_variety'),
      overall: count ? Number((items.reduce((sum, item) => sum + averageRating(item), 0) / count).toFixed(1)) : 0,
    };
    return acc;
  }, {});

  const recentComments = feedbackDocs
    .filter((doc) => doc.comment)
    .slice(0, 8)
    .map((doc) => ({
      meal: doc.meal,
      mess_type: doc.mess_type,
      menu_name: doc.menu_name,
      comment: doc.comment,
      overall: Number(averageRating(doc).toFixed(1)),
    }));

  const lowRatedMeals = feedbackDocs
    .map((doc) => ({
      meal: doc.meal,
      mess_type: doc.mess_type,
      menu_name: doc.menu_name,
      overall: Number(averageRating(doc).toFixed(1)),
    }))
    .filter((doc) => doc.overall <= 2.8)
    .slice(0, 5);

  res.json({
    success: true,
    block: blockName,
    date: requestedDate,
    totalResponses: feedbackDocs.length,
    meals: mealStats,
    recentComments,
    lowRatedMeals,
  });
}));

// PUT /api/v1/mess/menu — admin updates menu
router.put('/menu', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const {
    block_name,
    day,
    meal,
    mess_type,
    caterer,
    menu_name,
    items = [],
    nutrition = {},
  } = req.body;

  const sanitizedItems = items
    .filter((item) => item?.name)
    .map((item) => ({
      name: item.name,
      calories: Number(item.calories) || 0,
      protein: Number(item.protein) || 0,
      carbs: Number(item.carbs) || 0,
      fat: Number(item.fat) || 0,
    }));

  const sanitizedNutrition = {
    calories: Number(nutrition.calories) || 0,
    protein: Number(nutrition.protein) || 0,
    carbs: Number(nutrition.carbs) || 0,
    fat: Number(nutrition.fat) || 0,
    fiber: Number(nutrition.fiber) || 0,
  };

  const menuDoc = await MessMenu.findOneAndUpdate(
    { block_name, day, meal, mess_type },
    {
      block_name,
      week_start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      day,
      meal,
      mess_type,
      caterer,
      menu_name,
      items: sanitizedItems,
      nutrition: sanitizedNutrition,
      updated_by: req.user._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, menu: normalizeMenuDoc(menuDoc) });
}));

// POST /api/v1/mess/menu/seed-defaults — admin seeds the suggested menu
router.post('/menu/seed-defaults', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block_name = req.body.block_name || req.user.block_name || 'A Block';
  const week_start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const baseMenus = createMenuRecords(block_name).map((menu) => ({
    ...menu,
    week_start,
    updated_by: req.user._id,
  }));

  await Promise.all(baseMenus.map((menu) =>
    MessMenu.findOneAndUpdate(
      { block_name: menu.block_name, day: menu.day, meal: menu.meal, mess_type: menu.mess_type },
      menu,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  ));

  res.json({ success: true, message: `Suggested 7-day menu loaded for ${block_name}.` });
}));

// GET /api/v1/mess/night-menu — available night mess items
router.get('/night-menu', authenticate, asyncHandler(async (req, res) => {
  const blockName = req.query.block || req.user.block_name || 'A Block';
  const items = await ensureNightMenuCatalog(blockName, req.user._id);
  res.json({ success: true, block: blockName, items });
}));

// POST /api/v1/mess/night-menu/item — add night mess item
router.post('/night-menu/item', authenticate, isStaff, asyncHandler(async (req, res) => {
  const block_name = req.body.block_name || req.user.block_name || 'A Block';
  const item = await NightMessItem.create({
    block_name,
    name: req.body.name,
    description: req.body.description,
    category: req.body.category,
    price: Number(req.body.price) || 0,
    available_qty: Number(req.body.available_qty) || 0,
    prep_time_mins: Number(req.body.prep_time_mins) || 10,
    is_available: req.body.is_available !== false,
    updated_by: req.user._id,
  });

  res.status(201).json({ success: true, item });
}));

// PATCH /api/v1/mess/night-menu/item/:id — update stock/availability
router.patch('/night-menu/item/:id', authenticate, isStaff, asyncHandler(async (req, res) => {
  const item = await NightMessItem.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updated_by: req.user._id,
    },
    { new: true }
  );

  res.json({ success: true, item });
}));

// POST /api/v1/mess/night-order — student places night mess order
router.post('/night-order', authenticate, isStudent, asyncHandler(async (req, res) => {
  const requestedItems = req.body.items || [];
  const blockName = req.user.block_name || 'A Block';
  await ensureNightMenuCatalog(blockName, req.user._id);

  const catalogMap = new Map(
    (await NightMessItem.find({
      block_name: blockName,
      _id: { $in: requestedItems.map((item) => item.item_id).filter(Boolean) },
    })).map((item) => [String(item._id), item])
  );

  const items = requestedItems.map((entry) => {
    const catalogItem = catalogMap.get(String(entry.item_id));
    if (!catalogItem || !catalogItem.is_available) {
      throw new Error(`Night mess item unavailable: ${entry.item_id}`);
    }
    const qty = Math.max(1, Number(entry.qty) || 1);
    if (catalogItem.available_qty < qty) {
      throw new Error(`${catalogItem.name} is out of stock for the requested quantity.`);
    }
    return {
      item_id: catalogItem._id,
      name: catalogItem.name,
      qty,
      price: catalogItem.price,
      catalogItem,
    };
  });

  if (items.length === 0) {
    return res.status(400).json({ success: false, message: 'Select at least one night mess item.' });
  }

  const subtotal_amount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total_amount = subtotal_amount;

  await Promise.all(items.map((item) =>
    NightMessItem.findByIdAndUpdate(item.item_id, { $inc: { available_qty: -item.qty } })
  ));

  const order = await NightOrder.create({
    order_no: buildOrderNumber(),
    student_id: req.user._id,
    block_name: blockName,
    room_no: req.user.room_no,
    items: items.map(({ catalogItem, ...item }) => item),
    subtotal_amount,
    total_amount,
    payment_status: 'Paid',
    status: 'Confirmed',
    note: 'Paid in advance via hostel wallet',
  });
  res.status(201).json({ success: true, message: 'Night mess order placed and paid successfully.', order });
}));

// GET /api/v1/mess/night-order/my — student order history
router.get('/night-order/my', authenticate, isStudent, asyncHandler(async (req, res) => {
  const orders = await NightOrder.find({ student_id: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, orders });
}));

// GET /api/v1/mess/night-order/manage — staff order view
router.get('/night-order/manage', authenticate, isStaff, asyncHandler(async (req, res) => {
  const blockName = req.query.block || req.user.block_name || 'A Block';
  const orders = await NightOrder.find({ block_name: blockName }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, orders, block: blockName });
}));

// PATCH /api/v1/mess/night-order/:id/status — staff updates order lifecycle
router.patch('/night-order/:id/status', authenticate, isStaff, asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await NightOrder.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Night mess order not found.' });
  }

  order.note = note || order.note;

  if (status === 'Ready') {
    order.status = 'Ready';
    order.ready_at = new Date();
    notifyStudentOrderUpdate(order.student_id, 'Night Mess Ready', `Your order ${order.order_no} is ready for pickup.`);
  } else if (status === 'Preparing') {
    order.status = 'Preparing';
  } else if (status === 'Delivered') {
    order.status = 'Delivered';
    notifyStudentOrderUpdate(order.student_id, 'Night Mess Delivered', `Order ${order.order_no} has been marked as collected.`);
  } else if (status === 'OutOfStock' || status === 'NotReady') {
    order.status = status;
    order.payment_status = 'Refunded';
    order.refund_amount = order.total_amount;
    order.fine_amount = 0;
    order.refund_reason = status === 'OutOfStock' ? 'Item went out of stock after ordering.' : 'Order could not be prepared in time.';
    notifyStudentOrderUpdate(order.student_id, 'Night Mess Refund Issued', `${order.order_no} could not be fulfilled. Full refund of Rs ${order.refund_amount} has been initiated.`);
  } else if (status === 'NotCollected') {
    const fineAmount = Number((order.total_amount * 0.25).toFixed(2));
    const refundAmount = Number((order.total_amount - fineAmount).toFixed(2));
    order.status = 'NotCollected';
    order.payment_status = 'Fine Deducted';
    order.fine_amount = fineAmount;
    order.refund_amount = refundAmount;
    order.refund_reason = 'Order was ready, but student did not collect it. Pickup penalty applied.';
    notifyStudentOrderUpdate(order.student_id, 'Night Mess Partial Refund', `${order.order_no} was not collected. Rs ${fineAmount} deducted as fine, Rs ${refundAmount} refunded.`);
  } else if (status === 'Refunded') {
    order.status = 'Refunded';
    order.payment_status = 'Refunded';
    order.refund_amount = order.total_amount;
    order.fine_amount = 0;
    notifyStudentOrderUpdate(order.student_id, 'Night Mess Refund Issued', `Order ${order.order_no} has been refunded.`);
  } else {
    return res.status(400).json({ success: false, message: 'Unsupported night mess status update.' });
  }

  await order.save();
  res.json({ success: true, order });
}));

// GET /api/v1/mess/crowd — crowd prediction for mess
router.get('/crowd', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  const activeWindow = getMealWindow(hour);
  if (!activeWindow) {
    return res.json({ success: true, current_hour: hour, crowd: {
      meal: 'Off-peak',
      crowd_level: 'Low',
      estimated_fill_percent: 18,
      confidence: 0.95,
      recommendation: 'Best time to visit if you want no waiting.',
    } });
  }

  const blockName = req.user.block_name;
  const { dateKey, dayName } = getTodayMeta();
  const totalStudents = await Student.countDocuments({ block_name: blockName, is_active: { $ne: false } });
  const todayCounts = await MessAttendance.aggregate([
    { $match: { block_name: blockName, date_key: dateKey, meal: activeWindow.meal } },
    {
      $group: {
        _id: null,
        ateCount: { $sum: { $cond: [{ $eq: ['$status', 'Ate'] }, 1, 0] } },
        skippedCount: { $sum: { $cond: [{ $eq: ['$status', 'Skipped'] }, 1, 0] } },
      },
    },
  ]);

  const historicalAverage = await MessAttendance.aggregate([
    { $match: { block_name: blockName, day: dayName, meal: activeWindow.meal } },
    {
      $group: {
        _id: '$date_key',
        ateCount: { $sum: { $cond: [{ $eq: ['$status', 'Ate'] }, 1, 0] } },
      },
    },
    {
      $group: {
        _id: null,
        avgAteCount: { $avg: '$ateCount' },
      },
    },
  ]);

  const ateCount = todayCounts[0]?.ateCount || 0;
  const skippedCount = todayCounts[0]?.skippedCount || 0;
  const expectedDemand = Math.max(
    Math.round(historicalAverage[0]?.avgAteCount || 0),
    Math.round(totalStudents * (activeWindow.meal === 'Lunch' ? 0.78 : activeWindow.meal === 'Breakfast' ? 0.62 : activeWindow.meal === 'Dinner' ? 0.68 : 0.42))
  );
  const completionRatio = expectedDemand > 0 ? ateCount / expectedDemand : 0;
  const skipRatio = totalStudents > 0 ? skippedCount / totalStudents : 0;
  const estimatedFillPercent = Math.round(clamp(
    activeWindow.baseFill - (completionRatio * 34) - (skipRatio * 16),
    16,
    96
  ));
  const crowdLevel = estimatedFillPercent >= 80 ? 'Very High' : estimatedFillPercent >= 60 ? 'High' : estimatedFillPercent >= 35 ? 'Moderate' : 'Low';
  const queueMessage = crowdLevel === 'Very High'
    ? 'Peak rush is active right now.'
    : crowdLevel === 'High'
      ? 'Crowd is building. Going 15-20 minutes later may help.'
      : crowdLevel === 'Moderate'
        ? 'Queue is manageable at the moment.'
        : 'Mess is comparatively free right now.';

  const current = {
    meal: activeWindow.meal,
    crowd_level: crowdLevel,
    estimated_fill_percent: estimatedFillPercent,
    confidence: historicalAverage[0]?.avgAteCount ? 0.9 : 0.74,
    recommendation: `${queueMessage} ${ateCount} students have already marked ${activeWindow.meal.toLowerCase()} as eaten today.`,
    expected_demand: expectedDemand,
    actual_eaten: ateCount,
  };

  res.json({ success: true, current_hour: hour, crowd: current });
}));

module.exports = router;
