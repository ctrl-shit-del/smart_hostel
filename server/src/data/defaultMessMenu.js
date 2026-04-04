const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
const MESS_TYPES = ['Veg', 'Non-Veg', 'Special'];

const meal = (name, caterer, items, nutrition) => ({
  name,
  caterer,
  items,
  nutrition,
});

const DEFAULT_WEEKLY_MENU = {
  Monday: {
    Veg: {
      Breakfast: meal('South Indian Power Start', 'Fusion', [
        { name: 'Idli', calories: 160, protein: 6, carbs: 30, fat: 1 },
        { name: 'Sambar', calories: 110, protein: 5, carbs: 16, fat: 3 },
        { name: 'Coconut Chutney', calories: 90, protein: 2, carbs: 5, fat: 7 },
        { name: 'Banana', calories: 95, protein: 1, carbs: 23, fat: 0 },
      ], { calories: 455, protein: 14, carbs: 74, fat: 11, fiber: 9 }),
      Lunch: meal('Rajma Rice Combo', 'Fusion', [
        { name: 'Steamed Rice', calories: 210, protein: 4, carbs: 46, fat: 0 },
        { name: 'Rajma Masala', calories: 220, protein: 11, carbs: 28, fat: 7 },
        { name: 'Cabbage Poriyal', calories: 95, protein: 3, carbs: 10, fat: 4 },
        { name: 'Curd', calories: 80, protein: 4, carbs: 6, fat: 4 },
      ], { calories: 605, protein: 22, carbs: 90, fat: 15, fiber: 14 }),
      Snacks: meal('Tea Time Bite', 'Fusion', [
        { name: 'Masala Corn Chaat', calories: 170, protein: 5, carbs: 26, fat: 4 },
        { name: 'Buttermilk', calories: 60, protein: 3, carbs: 6, fat: 2 },
      ], { calories: 230, protein: 8, carbs: 32, fat: 6, fiber: 4 }),
      Dinner: meal('Roti Paneer Dinner', 'Fusion', [
        { name: 'Phulka', calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: 'Paneer Butter Masala', calories: 260, protein: 12, carbs: 12, fat: 18 },
        { name: 'Jeera Aloo', calories: 150, protein: 3, carbs: 20, fat: 6 },
        { name: 'Green Salad', calories: 40, protein: 2, carbs: 7, fat: 1 },
      ], { calories: 630, protein: 23, carbs: 73, fat: 27, fiber: 8 }),
    },
    'Non-Veg': {
      Breakfast: meal('Egg Bhurji Start', 'Rassence', [
        { name: 'Bread Toast', calories: 140, protein: 5, carbs: 24, fat: 2 },
        { name: 'Egg Bhurji', calories: 210, protein: 14, carbs: 4, fat: 15 },
        { name: 'Apple', calories: 80, protein: 0, carbs: 21, fat: 0 },
      ], { calories: 430, protein: 19, carbs: 49, fat: 17, fiber: 5 }),
      Lunch: meal('Chicken Curry Meal', 'Rassence', [
        { name: 'Rice', calories: 210, protein: 4, carbs: 46, fat: 0 },
        { name: 'Chicken Curry', calories: 280, protein: 24, carbs: 8, fat: 16 },
        { name: 'Dal Tadka', calories: 140, protein: 7, carbs: 16, fat: 5 },
        { name: 'Onion Salad', calories: 35, protein: 1, carbs: 7, fat: 0 },
      ], { calories: 665, protein: 36, carbs: 77, fat: 21, fiber: 7 }),
      Snacks: meal('Protein Snack', 'Rassence', [
        { name: 'Chicken Sandwich', calories: 240, protein: 16, carbs: 24, fat: 8 },
        { name: 'Lemon Tea', calories: 20, protein: 0, carbs: 4, fat: 0 },
      ], { calories: 260, protein: 16, carbs: 28, fat: 8, fiber: 2 }),
      Dinner: meal('Grilled Chicken Plate', 'Rassence', [
        { name: 'Chapati', calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: 'Grilled Chicken', calories: 260, protein: 28, carbs: 2, fat: 15 },
        { name: 'Sauteed Vegetables', calories: 110, protein: 4, carbs: 12, fat: 4 },
        { name: 'Soup', calories: 70, protein: 3, carbs: 9, fat: 2 },
      ], { calories: 620, protein: 41, carbs: 57, fat: 23, fiber: 6 }),
    },
    Special: {
      Breakfast: meal('Millet Wellness Bowl', 'Grace', [
        { name: 'Ragi Dosa', calories: 190, protein: 6, carbs: 32, fat: 4 },
        { name: 'Peanut Chutney', calories: 120, protein: 4, carbs: 6, fat: 9 },
        { name: 'Sprouts Salad', calories: 90, protein: 7, carbs: 12, fat: 1 },
      ], { calories: 400, protein: 17, carbs: 50, fat: 14, fiber: 8 }),
      Lunch: meal('Balanced Thali', 'Grace', [
        { name: 'Quinoa Pulao', calories: 240, protein: 8, carbs: 36, fat: 6 },
        { name: 'Palak Paneer', calories: 220, protein: 13, carbs: 10, fat: 14 },
        { name: 'Moong Salad', calories: 120, protein: 8, carbs: 16, fat: 2 },
        { name: 'Fruit Cup', calories: 70, protein: 1, carbs: 17, fat: 0 },
      ], { calories: 650, protein: 30, carbs: 79, fat: 22, fiber: 12 }),
      Snacks: meal('Healthy Refuel', 'Grace', [
        { name: 'Roasted Makhana', calories: 130, protein: 4, carbs: 18, fat: 4 },
        { name: 'Fresh Lime Water', calories: 35, protein: 0, carbs: 8, fat: 0 },
      ], { calories: 165, protein: 4, carbs: 26, fat: 4, fiber: 2 }),
      Dinner: meal('Light Gourmet Dinner', 'Grace', [
        { name: 'Herb Rice', calories: 190, protein: 4, carbs: 35, fat: 3 },
        { name: 'Stuffed Capsicum', calories: 210, protein: 9, carbs: 20, fat: 10 },
        { name: 'Tomato Basil Soup', calories: 80, protein: 3, carbs: 12, fat: 2 },
        { name: 'Yogurt Dip', calories: 60, protein: 3, carbs: 5, fat: 3 },
      ], { calories: 540, protein: 19, carbs: 72, fat: 18, fiber: 9 }),
    },
  },
  Tuesday: {
    Veg: {
      Breakfast: meal('Poha and Protein', 'Fusion', [
        { name: 'Vegetable Poha', calories: 250, protein: 6, carbs: 42, fat: 6 },
        { name: 'Boiled Chana', calories: 110, protein: 6, carbs: 18, fat: 1 },
        { name: 'Orange', calories: 70, protein: 1, carbs: 17, fat: 0 },
      ], { calories: 430, protein: 13, carbs: 77, fat: 7, fiber: 8 }),
      Lunch: meal('North Indian Thali', 'Fusion', [
        { name: 'Chapati', calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: 'Chole Masala', calories: 240, protein: 10, carbs: 28, fat: 8 },
        { name: 'Veg Pulao', calories: 190, protein: 4, carbs: 33, fat: 4 },
        { name: 'Raita', calories: 85, protein: 4, carbs: 7, fat: 4 },
      ], { calories: 695, protein: 24, carbs: 102, fat: 18, fiber: 13 }),
      Snacks: meal('Crisp Evening Snack', 'Fusion', [
        { name: 'Baked Samosa', calories: 160, protein: 4, carbs: 22, fat: 6 },
        { name: 'Mint Chutney', calories: 25, protein: 1, carbs: 4, fat: 0 },
        { name: 'Tea', calories: 45, protein: 1, carbs: 7, fat: 1 },
      ], { calories: 230, protein: 6, carbs: 33, fat: 7, fiber: 3 }),
      Dinner: meal('Comfort Dal Khichdi', 'Fusion', [
        { name: 'Moong Dal Khichdi', calories: 320, protein: 12, carbs: 48, fat: 8 },
        { name: 'Kadhi', calories: 120, protein: 5, carbs: 12, fat: 5 },
        { name: 'Beetroot Salad', calories: 55, protein: 2, carbs: 10, fat: 1 },
      ], { calories: 495, protein: 19, carbs: 70, fat: 14, fiber: 9 }),
    },
    'Non-Veg': {
      Breakfast: meal('Keema Pav Morning', 'Rassence', [
        { name: 'Chicken Keema', calories: 240, protein: 20, carbs: 8, fat: 14 },
        { name: 'Pav', calories: 160, protein: 5, carbs: 28, fat: 3 },
        { name: 'Papaya', calories: 55, protein: 1, carbs: 14, fat: 0 },
      ], { calories: 455, protein: 26, carbs: 50, fat: 17, fiber: 4 }),
      Lunch: meal('Fish Curry Lunch', 'Rassence', [
        { name: 'Rice', calories: 210, protein: 4, carbs: 46, fat: 0 },
        { name: 'Fish Curry', calories: 260, protein: 23, carbs: 6, fat: 16 },
        { name: 'Beans Stir Fry', calories: 95, protein: 3, carbs: 10, fat: 4 },
        { name: 'Curd', calories: 80, protein: 4, carbs: 6, fat: 4 },
      ], { calories: 645, protein: 34, carbs: 68, fat: 24, fiber: 6 }),
      Snacks: meal('Egg Snack Box', 'Rassence', [
        { name: 'Egg Puff', calories: 220, protein: 8, carbs: 20, fat: 12 },
        { name: 'Black Tea', calories: 10, protein: 0, carbs: 2, fat: 0 },
      ], { calories: 230, protein: 8, carbs: 22, fat: 12, fiber: 1 }),
      Dinner: meal('Mughlai Chicken Dinner', 'Rassence', [
        { name: 'Jeera Rice', calories: 220, protein: 4, carbs: 40, fat: 4 },
        { name: 'Chicken Do Pyaza', calories: 290, protein: 25, carbs: 9, fat: 17 },
        { name: 'Tandoori Roti', calories: 130, protein: 4, carbs: 24, fat: 2 },
        { name: 'Kachumber', calories: 35, protein: 1, carbs: 7, fat: 0 },
      ], { calories: 675, protein: 34, carbs: 80, fat: 23, fiber: 5 }),
    },
    Special: {
      Breakfast: meal('Oats and Fruit Platter', 'Grace', [
        { name: 'Masala Oats', calories: 210, protein: 7, carbs: 34, fat: 5 },
        { name: 'Greek Yogurt', calories: 100, protein: 8, carbs: 6, fat: 4 },
        { name: 'Mixed Fruit Bowl', calories: 85, protein: 1, carbs: 20, fat: 0 },
      ], { calories: 395, protein: 16, carbs: 60, fat: 9, fiber: 7 }),
      Lunch: meal('High Protein Plate', 'Grace', [
        { name: 'Brown Rice', calories: 215, protein: 5, carbs: 44, fat: 2 },
        { name: 'Tofu Bhurji', calories: 180, protein: 15, carbs: 8, fat: 10 },
        { name: 'Lentil Soup', calories: 130, protein: 9, carbs: 18, fat: 2 },
        { name: 'Sauteed Greens', calories: 75, protein: 3, carbs: 8, fat: 3 },
      ], { calories: 600, protein: 32, carbs: 78, fat: 17, fiber: 13 }),
      Snacks: meal('Trail Mix Break', 'Grace', [
        { name: 'Dates and Nuts Mix', calories: 190, protein: 5, carbs: 18, fat: 11 },
        { name: 'Green Tea', calories: 5, protein: 0, carbs: 1, fat: 0 },
      ], { calories: 195, protein: 5, carbs: 19, fat: 11, fiber: 3 }),
      Dinner: meal('Mediterranean Bowl', 'Grace', [
        { name: 'Couscous Pilaf', calories: 210, protein: 7, carbs: 38, fat: 3 },
        { name: 'Grilled Cottage Cheese', calories: 190, protein: 14, carbs: 6, fat: 11 },
        { name: 'Hummus', calories: 90, protein: 3, carbs: 8, fat: 5 },
        { name: 'Roasted Veggies', calories: 95, protein: 3, carbs: 13, fat: 3 },
      ], { calories: 585, protein: 27, carbs: 65, fat: 22, fiber: 10 }),
    },
  },
  Wednesday: {
    Veg: {
      Breakfast: meal('Stuffed Paratha Combo', 'Fusion', [
        { name: 'Aloo Paratha', calories: 260, protein: 6, carbs: 38, fat: 9 },
        { name: 'Curd', calories: 80, protein: 4, carbs: 6, fat: 4 },
        { name: 'Mint Chutney', calories: 25, protein: 1, carbs: 4, fat: 0 },
      ], { calories: 365, protein: 11, carbs: 48, fat: 13, fiber: 5 }),
      Lunch: meal('Sambar Rice Special', 'Fusion', [
        { name: 'Sambar Rice', calories: 340, protein: 11, carbs: 54, fat: 8 },
        { name: 'Potato Roast', calories: 150, protein: 3, carbs: 19, fat: 6 },
        { name: 'Kosambari', calories: 95, protein: 5, carbs: 12, fat: 2 },
      ], { calories: 585, protein: 19, carbs: 85, fat: 16, fiber: 10 }),
      Snacks: meal('Classic Snack Hour', 'Fusion', [
        { name: 'Vegetable Cutlet', calories: 180, protein: 4, carbs: 24, fat: 7 },
        { name: 'Tomato Ketchup', calories: 20, protein: 0, carbs: 5, fat: 0 },
        { name: 'Coffee', calories: 55, protein: 2, carbs: 7, fat: 2 },
      ], { calories: 255, protein: 6, carbs: 36, fat: 9, fiber: 3 }),
      Dinner: meal('Noodle and Manchurian', 'Fusion', [
        { name: 'Hakka Noodles', calories: 280, protein: 8, carbs: 42, fat: 9 },
        { name: 'Veg Manchurian', calories: 210, protein: 6, carbs: 18, fat: 11 },
        { name: 'Clear Soup', calories: 55, protein: 2, carbs: 8, fat: 1 },
      ], { calories: 545, protein: 16, carbs: 68, fat: 21, fiber: 6 }),
    },
    'Non-Veg': {
      Breakfast: meal('Chicken Sausage Breakfast', 'Rassence', [
        { name: 'Chicken Sausage', calories: 180, protein: 11, carbs: 3, fat: 13 },
        { name: 'Masala Upma', calories: 220, protein: 5, carbs: 34, fat: 7 },
        { name: 'Guava', calories: 65, protein: 2, carbs: 14, fat: 1 },
      ], { calories: 465, protein: 18, carbs: 51, fat: 21, fiber: 5 }),
      Lunch: meal('Egg Curry Combo', 'Rassence', [
        { name: 'Rice', calories: 210, protein: 4, carbs: 46, fat: 0 },
        { name: 'Egg Curry', calories: 250, protein: 15, carbs: 8, fat: 16 },
        { name: 'Chapati', calories: 90, protein: 3, carbs: 17, fat: 1 },
        { name: 'Cucumber Salad', calories: 30, protein: 1, carbs: 5, fat: 0 },
      ], { calories: 580, protein: 23, carbs: 76, fat: 17, fiber: 4 }),
      Snacks: meal('Roll and Sip', 'Rassence', [
        { name: 'Chicken Roll', calories: 265, protein: 14, carbs: 24, fat: 11 },
        { name: 'Fresh Lime Soda', calories: 60, protein: 0, carbs: 15, fat: 0 },
      ], { calories: 325, protein: 14, carbs: 39, fat: 11, fiber: 2 }),
      Dinner: meal('Pepper Chicken Night', 'Rassence', [
        { name: 'Malabar Parotta', calories: 240, protein: 5, carbs: 30, fat: 10 },
        { name: 'Pepper Chicken', calories: 280, protein: 25, carbs: 6, fat: 17 },
        { name: 'Veg Stew', calories: 95, protein: 3, carbs: 10, fat: 4 },
      ], { calories: 615, protein: 33, carbs: 46, fat: 31, fiber: 4 }),
    },
    Special: {
      Breakfast: meal('Protein Pancake Plate', 'Grace', [
        { name: 'Besan Chilla', calories: 210, protein: 10, carbs: 22, fat: 8 },
        { name: 'Mint Yogurt Dip', calories: 60, protein: 3, carbs: 4, fat: 3 },
        { name: 'Kiwi', calories: 50, protein: 1, carbs: 12, fat: 0 },
      ], { calories: 320, protein: 14, carbs: 38, fat: 11, fiber: 6 }),
      Lunch: meal('Executive Lunch Box', 'Grace', [
        { name: 'Multigrain Roti', calories: 170, protein: 6, carbs: 30, fat: 3 },
        { name: 'Soya Methi Curry', calories: 210, protein: 15, carbs: 14, fat: 10 },
        { name: 'Millet Salad', calories: 150, protein: 5, carbs: 26, fat: 3 },
        { name: 'Lassi', calories: 110, protein: 5, carbs: 12, fat: 4 },
      ], { calories: 640, protein: 31, carbs: 82, fat: 20, fiber: 11 }),
      Snacks: meal('Fresh Pressed Break', 'Grace', [
        { name: 'Vegetable Juice', calories: 70, protein: 2, carbs: 15, fat: 0 },
        { name: 'Baked Sweet Potato Wedges', calories: 140, protein: 2, carbs: 29, fat: 2 },
      ], { calories: 210, protein: 4, carbs: 44, fat: 2, fiber: 5 }),
      Dinner: meal('Soup and Sizzler', 'Grace', [
        { name: 'Herbed Couscous', calories: 200, protein: 6, carbs: 36, fat: 3 },
        { name: 'Paneer Steak', calories: 220, protein: 14, carbs: 8, fat: 14 },
        { name: 'Broccoli Soup', calories: 85, protein: 4, carbs: 10, fat: 3 },
      ], { calories: 505, protein: 24, carbs: 54, fat: 20, fiber: 7 }),
    },
  },
  Thursday: {
    Veg: {
      Breakfast: meal('Mini Tiffin Combo', 'Fusion', [
        { name: 'Mini Uttapam', calories: 220, protein: 6, carbs: 34, fat: 6 },
        { name: 'Sambar', calories: 110, protein: 5, carbs: 16, fat: 3 },
        { name: 'Chutney', calories: 70, protein: 2, carbs: 4, fat: 5 },
      ], { calories: 400, protein: 13, carbs: 54, fat: 14, fiber: 6 }),
      Lunch: meal('Paneer Pulao Day', 'Fusion', [
        { name: 'Paneer Pulao', calories: 320, protein: 12, carbs: 42, fat: 11 },
        { name: 'Dal Fry', calories: 150, protein: 7, carbs: 18, fat: 5 },
        { name: 'Carrot Beans Subzi', calories: 100, protein: 3, carbs: 12, fat: 4 },
        { name: 'Papad', calories: 35, protein: 2, carbs: 4, fat: 1 },
      ], { calories: 605, protein: 24, carbs: 76, fat: 21, fiber: 9 }),
      Snacks: meal('Street Style Evening', 'Fusion', [
        { name: 'Bhel Puri', calories: 190, protein: 5, carbs: 30, fat: 5 },
        { name: 'Masala Tea', calories: 45, protein: 1, carbs: 7, fat: 1 },
      ], { calories: 235, protein: 6, carbs: 37, fat: 6, fiber: 3 }),
      Dinner: meal('Roti Dal Combo', 'Fusion', [
        { name: 'Chapati', calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: 'Dal Makhani', calories: 240, protein: 10, carbs: 22, fat: 12 },
        { name: 'Bhindi Fry', calories: 120, protein: 3, carbs: 10, fat: 7 },
        { name: 'Salad', calories: 35, protein: 1, carbs: 6, fat: 0 },
      ], { calories: 575, protein: 20, carbs: 72, fat: 21, fiber: 10 }),
    },
    'Non-Veg': {
      Breakfast: meal('Egg Masala Dosa', 'Rassence', [
        { name: 'Egg Dosa', calories: 280, protein: 12, carbs: 30, fat: 11 },
        { name: 'Sambar', calories: 110, protein: 5, carbs: 16, fat: 3 },
        { name: 'Pineapple', calories: 60, protein: 1, carbs: 15, fat: 0 },
      ], { calories: 450, protein: 18, carbs: 61, fat: 14, fiber: 5 }),
      Lunch: meal('Mutton Masala Treat', 'Rassence', [
        { name: 'Rice', calories: 210, protein: 4, carbs: 46, fat: 0 },
        { name: 'Mutton Masala', calories: 320, protein: 24, carbs: 7, fat: 21 },
        { name: 'Dal Palak', calories: 130, protein: 7, carbs: 14, fat: 4 },
        { name: 'Pickled Onion', calories: 20, protein: 0, carbs: 5, fat: 0 },
      ], { calories: 680, protein: 35, carbs: 72, fat: 25, fiber: 6 }),
      Snacks: meal('Spicy Bite', 'Rassence', [
        { name: 'Chicken Pakoda', calories: 230, protein: 18, carbs: 8, fat: 14 },
        { name: 'Mint Dip', calories: 25, protein: 1, carbs: 4, fat: 0 },
      ], { calories: 255, protein: 19, carbs: 12, fat: 14, fiber: 1 }),
      Dinner: meal('Egg Fried Rice Dinner', 'Rassence', [
        { name: 'Egg Fried Rice', calories: 340, protein: 13, carbs: 44, fat: 12 },
        { name: 'Chilli Chicken', calories: 250, protein: 19, carbs: 10, fat: 15 },
        { name: 'Clear Soup', calories: 55, protein: 2, carbs: 8, fat: 1 },
      ], { calories: 645, protein: 34, carbs: 62, fat: 28, fiber: 3 }),
    },
    Special: {
      Breakfast: meal('Yogurt Parfait Start', 'Grace', [
        { name: 'Granola Yogurt Cup', calories: 220, protein: 9, carbs: 28, fat: 8 },
        { name: 'Chia Seeds', calories: 55, protein: 2, carbs: 5, fat: 3 },
        { name: 'Berries', calories: 45, protein: 1, carbs: 11, fat: 0 },
      ], { calories: 320, protein: 12, carbs: 44, fat: 11, fiber: 8 }),
      Lunch: meal('Gut Friendly Bowl', 'Grace', [
        { name: 'Red Rice', calories: 220, protein: 5, carbs: 45, fat: 2 },
        { name: 'Vegetable Korma', calories: 180, protein: 5, carbs: 16, fat: 9 },
        { name: 'Curd Rice Shot', calories: 95, protein: 3, carbs: 13, fat: 3 },
        { name: 'Sprout Pachadi', calories: 110, protein: 6, carbs: 12, fat: 3 },
      ], { calories: 605, protein: 19, carbs: 86, fat: 17, fiber: 10 }),
      Snacks: meal('Fruit and Seed Box', 'Grace', [
        { name: 'Seasonal Fruit Slices', calories: 85, protein: 1, carbs: 20, fat: 0 },
        { name: 'Pumpkin Seeds', calories: 90, protein: 5, carbs: 3, fat: 7 },
      ], { calories: 175, protein: 6, carbs: 23, fat: 7, fiber: 4 }),
      Dinner: meal('Steamed Dinner Tray', 'Grace', [
        { name: 'Lemon Coriander Soup', calories: 60, protein: 2, carbs: 10, fat: 1 },
        { name: 'Vegetable Lasagna', calories: 260, protein: 11, carbs: 26, fat: 12 },
        { name: 'Sauteed Zucchini', calories: 80, protein: 2, carbs: 8, fat: 4 },
      ], { calories: 400, protein: 15, carbs: 44, fat: 17, fiber: 6 }),
    },
  },
  Friday: {
    Veg: {
      Breakfast: meal('Chole Kulcha Breakfast', 'Fusion', [
        { name: 'Mini Kulcha', calories: 180, protein: 5, carbs: 30, fat: 4 },
        { name: 'Chole', calories: 220, protein: 9, carbs: 26, fat: 8 },
        { name: 'Cucumber Sticks', calories: 20, protein: 1, carbs: 4, fat: 0 },
      ], { calories: 420, protein: 15, carbs: 60, fat: 12, fiber: 10 }),
      Lunch: meal('Curd Rice Comfort', 'Fusion', [
        { name: 'Curd Rice', calories: 280, protein: 8, carbs: 40, fat: 9 },
        { name: 'Beetroot Poriyal', calories: 95, protein: 2, carbs: 13, fat: 4 },
        { name: 'Sundal', calories: 120, protein: 6, carbs: 18, fat: 2 },
      ], { calories: 495, protein: 16, carbs: 71, fat: 15, fiber: 8 }),
      Snacks: meal('Friday Chaat', 'Fusion', [
        { name: 'Dahi Puri', calories: 210, protein: 5, carbs: 28, fat: 8 },
        { name: 'Jaljeera', calories: 30, protein: 0, carbs: 7, fat: 0 },
      ], { calories: 240, protein: 5, carbs: 35, fat: 8, fiber: 2 }),
      Dinner: meal('Veg Biryani Night', 'Fusion', [
        { name: 'Vegetable Biryani', calories: 330, protein: 8, carbs: 48, fat: 11 },
        { name: 'Mirchi Ka Salan', calories: 130, protein: 3, carbs: 11, fat: 8 },
        { name: 'Raita', calories: 85, protein: 4, carbs: 7, fat: 4 },
      ], { calories: 545, protein: 15, carbs: 66, fat: 23, fiber: 7 }),
    },
    'Non-Veg': {
      Breakfast: meal('Loaded Omelette Plate', 'Rassence', [
        { name: 'Cheese Omelette', calories: 240, protein: 16, carbs: 3, fat: 17 },
        { name: 'Brown Bread', calories: 130, protein: 5, carbs: 22, fat: 2 },
        { name: 'Melon', calories: 50, protein: 1, carbs: 12, fat: 0 },
      ], { calories: 420, protein: 22, carbs: 37, fat: 19, fiber: 3 }),
      Lunch: meal('Friday Biryani Feast', 'Rassence', [
        { name: 'Chicken Biryani', calories: 420, protein: 24, carbs: 42, fat: 17 },
        { name: 'Boiled Egg', calories: 75, protein: 6, carbs: 1, fat: 5 },
        { name: 'Onion Raita', calories: 90, protein: 4, carbs: 8, fat: 4 },
      ], { calories: 585, protein: 34, carbs: 51, fat: 26, fiber: 3 }),
      Snacks: meal('Tandoori Break', 'Rassence', [
        { name: 'Tandoori Wings', calories: 210, protein: 18, carbs: 4, fat: 13 },
        { name: 'Mint Cooler', calories: 45, protein: 0, carbs: 11, fat: 0 },
      ], { calories: 255, protein: 18, carbs: 15, fat: 13, fiber: 1 }),
      Dinner: meal('Fish Grill Supper', 'Rassence', [
        { name: 'Lemon Rice', calories: 250, protein: 5, carbs: 44, fat: 6 },
        { name: 'Grilled Fish Fillet', calories: 230, protein: 25, carbs: 3, fat: 13 },
        { name: 'Sauteed Beans', calories: 85, protein: 3, carbs: 9, fat: 3 },
      ], { calories: 565, protein: 33, carbs: 56, fat: 22, fiber: 4 }),
    },
    Special: {
      Breakfast: meal('Smoothie Bowl Morning', 'Grace', [
        { name: 'Peanut Banana Smoothie Bowl', calories: 260, protein: 9, carbs: 34, fat: 10 },
        { name: 'Flax Seeds', calories: 45, protein: 2, carbs: 3, fat: 3 },
      ], { calories: 305, protein: 11, carbs: 37, fat: 13, fiber: 7 }),
      Lunch: meal('Wellness Friday Thali', 'Grace', [
        { name: 'Foxtail Millet', calories: 220, protein: 6, carbs: 42, fat: 3 },
        { name: 'Mushroom Pepper Fry', calories: 160, protein: 6, carbs: 12, fat: 8 },
        { name: 'Dal Spinach', calories: 140, protein: 8, carbs: 16, fat: 4 },
        { name: 'Cucumber Yogurt', calories: 75, protein: 3, carbs: 6, fat: 3 },
      ], { calories: 595, protein: 23, carbs: 76, fat: 18, fiber: 11 }),
      Snacks: meal('Fiber Boost', 'Grace', [
        { name: 'Whole Wheat Muffin', calories: 155, protein: 4, carbs: 25, fat: 4 },
        { name: 'Herbal Tea', calories: 5, protein: 0, carbs: 1, fat: 0 },
      ], { calories: 160, protein: 4, carbs: 26, fat: 4, fiber: 3 }),
      Dinner: meal('Light Asian Spread', 'Grace', [
        { name: 'Rice Noodles', calories: 220, protein: 4, carbs: 42, fat: 3 },
        { name: 'Tofu in Black Bean Sauce', calories: 190, protein: 14, carbs: 10, fat: 10 },
        { name: 'Steamed Greens', calories: 65, protein: 3, carbs: 8, fat: 2 },
      ], { calories: 475, protein: 21, carbs: 60, fat: 15, fiber: 6 }),
    },
  },
  Saturday: {
    Veg: {
      Breakfast: meal('Weekend Dosa Counter', 'Fusion', [
        { name: 'Masala Dosa', calories: 310, protein: 7, carbs: 42, fat: 12 },
        { name: 'Sambar', calories: 110, protein: 5, carbs: 16, fat: 3 },
        { name: 'Chutney', calories: 70, protein: 2, carbs: 4, fat: 5 },
      ], { calories: 490, protein: 14, carbs: 62, fat: 20, fiber: 6 }),
      Lunch: meal('Punjabi Lunch Tray', 'Fusion', [
        { name: 'Jeera Rice', calories: 220, protein: 4, carbs: 40, fat: 4 },
        { name: 'Kadai Paneer', calories: 250, protein: 12, carbs: 12, fat: 17 },
        { name: 'Dal Khichu', calories: 110, protein: 5, carbs: 14, fat: 3 },
        { name: 'Salad', calories: 35, protein: 1, carbs: 6, fat: 0 },
      ], { calories: 615, protein: 22, carbs: 72, fat: 24, fiber: 8 }),
      Snacks: meal('Weekend Munchies', 'Fusion', [
        { name: 'Pav Bhaji', calories: 280, protein: 7, carbs: 36, fat: 11 },
        { name: 'Onion Lemon Mix', calories: 20, protein: 0, carbs: 4, fat: 0 },
      ], { calories: 300, protein: 7, carbs: 40, fat: 11, fiber: 5 }),
      Dinner: meal('Festival Dinner', 'Fusion', [
        { name: 'Veg Fried Rice', calories: 300, protein: 7, carbs: 44, fat: 10 },
        { name: 'Paneer Chilli Dry', calories: 240, protein: 13, carbs: 14, fat: 14 },
        { name: 'Sweet Corn Soup', calories: 90, protein: 3, carbs: 14, fat: 2 },
      ], { calories: 630, protein: 23, carbs: 72, fat: 26, fiber: 6 }),
    },
    'Non-Veg': {
      Breakfast: meal('Weekend Egg Wrap', 'Rassence', [
        { name: 'Egg Wrap', calories: 290, protein: 14, carbs: 30, fat: 12 },
        { name: 'Hash Brown', calories: 130, protein: 2, carbs: 16, fat: 7 },
      ], { calories: 420, protein: 16, carbs: 46, fat: 19, fiber: 3 }),
      Lunch: meal('Weekend Special Curry', 'Rassence', [
        { name: 'Butter Rice', calories: 260, protein: 4, carbs: 42, fat: 8 },
        { name: 'Chicken Chettinad', calories: 300, protein: 25, carbs: 7, fat: 19 },
        { name: 'Veg Poriyal', calories: 95, protein: 3, carbs: 10, fat: 4 },
      ], { calories: 655, protein: 32, carbs: 59, fat: 31, fiber: 5 }),
      Snacks: meal('Weekend Grill Snack', 'Rassence', [
        { name: 'Chicken Seekh Roll', calories: 280, protein: 17, carbs: 26, fat: 11 },
        { name: 'Cold Coffee', calories: 95, protein: 3, carbs: 14, fat: 3 },
      ], { calories: 375, protein: 20, carbs: 40, fat: 14, fiber: 2 }),
      Dinner: meal('Hearty Supper', 'Rassence', [
        { name: 'Rumali Roti', calories: 150, protein: 4, carbs: 28, fat: 2 },
        { name: 'Chicken Korma', calories: 310, protein: 24, carbs: 8, fat: 20 },
        { name: 'Mixed Veg', calories: 100, protein: 3, carbs: 12, fat: 4 },
      ], { calories: 560, protein: 31, carbs: 48, fat: 26, fiber: 4 }),
    },
    Special: {
      Breakfast: meal('Weekend Brunch Lite', 'Grace', [
        { name: 'Avocado Toast', calories: 220, protein: 6, carbs: 24, fat: 10 },
        { name: 'Boiled Chickpeas', calories: 110, protein: 6, carbs: 18, fat: 1 },
      ], { calories: 330, protein: 12, carbs: 42, fat: 11, fiber: 9 }),
      Lunch: meal('Chef Crafted Bowl', 'Grace', [
        { name: 'Lemon Quinoa', calories: 230, protein: 8, carbs: 36, fat: 5 },
        { name: 'Grilled Veg Skewers', calories: 140, protein: 4, carbs: 14, fat: 7 },
        { name: 'Hummus Salad', calories: 150, protein: 5, carbs: 12, fat: 8 },
        { name: 'Kefir Drink', calories: 80, protein: 4, carbs: 8, fat: 3 },
      ], { calories: 600, protein: 21, carbs: 70, fat: 23, fiber: 11 }),
      Snacks: meal('Crunch and Cool', 'Grace', [
        { name: 'Carrot Hummus Cup', calories: 145, protein: 4, carbs: 14, fat: 7 },
        { name: 'Coconut Water', calories: 40, protein: 0, carbs: 10, fat: 0 },
      ], { calories: 185, protein: 4, carbs: 24, fat: 7, fiber: 4 }),
      Dinner: meal('Satin Light Dinner', 'Grace', [
        { name: 'Vegetable Clear Soup', calories: 55, protein: 2, carbs: 9, fat: 1 },
        { name: 'Spinach Ricotta Cannelloni', calories: 260, protein: 12, carbs: 24, fat: 12 },
        { name: 'Garlic Beans', calories: 85, protein: 3, carbs: 9, fat: 4 },
      ], { calories: 400, protein: 17, carbs: 42, fat: 17, fiber: 6 }),
    },
  },
  Sunday: {
    Veg: {
      Breakfast: meal('Sunday Brunch', 'Fusion', [
        { name: 'Puri', calories: 220, protein: 4, carbs: 24, fat: 11 },
        { name: 'Aloo Sabzi', calories: 170, protein: 3, carbs: 22, fat: 7 },
        { name: 'Kesari', calories: 130, protein: 2, carbs: 24, fat: 3 },
      ], { calories: 520, protein: 9, carbs: 70, fat: 21, fiber: 4 }),
      Lunch: meal('Sunday Special Thali', 'Fusion', [
        { name: 'Veg Pulao', calories: 190, protein: 4, carbs: 33, fat: 4 },
        { name: 'Shahi Paneer', calories: 270, protein: 12, carbs: 11, fat: 19 },
        { name: 'Dal Tadka', calories: 140, protein: 7, carbs: 16, fat: 5 },
        { name: 'Gulab Jamun', calories: 150, protein: 2, carbs: 26, fat: 5 },
      ], { calories: 750, protein: 25, carbs: 86, fat: 33, fiber: 7 }),
      Snacks: meal('Evening Treat', 'Fusion', [
        { name: 'Veg Pizza Slice', calories: 220, protein: 8, carbs: 26, fat: 9 },
        { name: 'Iced Tea', calories: 55, protein: 0, carbs: 13, fat: 0 },
      ], { calories: 275, protein: 8, carbs: 39, fat: 9, fiber: 2 }),
      Dinner: meal('Sunday Light Dinner', 'Fusion', [
        { name: 'Tomato Rice', calories: 250, protein: 5, carbs: 42, fat: 6 },
        { name: 'Mixed Veg Kurma', calories: 180, protein: 5, carbs: 14, fat: 9 },
        { name: 'Curd', calories: 80, protein: 4, carbs: 6, fat: 4 },
      ], { calories: 510, protein: 14, carbs: 62, fat: 19, fiber: 6 }),
    },
    'Non-Veg': {
      Breakfast: meal('Sunday Brunch Protein', 'Rassence', [
        { name: 'Chicken Stuffed Kulcha', calories: 310, protein: 16, carbs: 32, fat: 12 },
        { name: 'Mint Yogurt', calories: 65, protein: 3, carbs: 5, fat: 3 },
      ], { calories: 375, protein: 19, carbs: 37, fat: 15, fiber: 3 }),
      Lunch: meal('Grand Sunday Lunch', 'Rassence', [
        { name: 'Mutton Biryani', calories: 460, protein: 24, carbs: 44, fat: 21 },
        { name: 'Egg Masala', calories: 140, protein: 8, carbs: 4, fat: 10 },
        { name: 'Raita', calories: 85, protein: 4, carbs: 7, fat: 4 },
      ], { calories: 685, protein: 36, carbs: 55, fat: 35, fiber: 3 }),
      Snacks: meal('Sunday Snack Bar', 'Rassence', [
        { name: 'Chicken Burger', calories: 320, protein: 18, carbs: 28, fat: 15 },
        { name: 'Mint Lemonade', calories: 60, protein: 0, carbs: 15, fat: 0 },
      ], { calories: 380, protein: 18, carbs: 43, fat: 15, fiber: 2 }),
      Dinner: meal('Roast Dinner', 'Rassence', [
        { name: 'Herb Rice', calories: 190, protein: 4, carbs: 35, fat: 3 },
        { name: 'Roast Chicken', calories: 280, protein: 27, carbs: 4, fat: 17 },
        { name: 'Sauteed Carrots', calories: 80, protein: 2, carbs: 10, fat: 3 },
      ], { calories: 550, protein: 33, carbs: 49, fat: 23, fiber: 4 }),
    },
    Special: {
      Breakfast: meal('Sunday Recovery Breakfast', 'Grace', [
        { name: 'Multigrain Waffles', calories: 240, protein: 8, carbs: 32, fat: 8 },
        { name: 'Honey Yogurt', calories: 110, protein: 5, carbs: 14, fat: 3 },
        { name: 'Fruit Topping', calories: 60, protein: 1, carbs: 15, fat: 0 },
      ], { calories: 410, protein: 14, carbs: 61, fat: 11, fiber: 6 }),
      Lunch: meal('Signature Sunday Plate', 'Grace', [
        { name: 'Wild Rice Blend', calories: 230, protein: 6, carbs: 42, fat: 3 },
        { name: 'Stuffed Paneer Roll', calories: 220, protein: 13, carbs: 12, fat: 13 },
        { name: 'Broccoli Almond Stir Fry', calories: 120, protein: 5, carbs: 10, fat: 6 },
        { name: 'Berry Smoothie', calories: 110, protein: 4, carbs: 18, fat: 2 },
      ], { calories: 680, protein: 28, carbs: 82, fat: 24, fiber: 10 }),
      Snacks: meal('Low GI Snack', 'Grace', [
        { name: 'Oats Cookie', calories: 130, protein: 3, carbs: 18, fat: 5 },
        { name: 'Unsweetened Almond Milk', calories: 35, protein: 1, carbs: 2, fat: 3 },
      ], { calories: 165, protein: 4, carbs: 20, fat: 8, fiber: 2 }),
      Dinner: meal('Detox Dinner', 'Grace', [
        { name: 'Vegetable Stew', calories: 150, protein: 4, carbs: 20, fat: 5 },
        { name: 'Millet Appam', calories: 180, protein: 5, carbs: 32, fat: 3 },
        { name: 'Sauteed Mushrooms', calories: 90, protein: 4, carbs: 7, fat: 5 },
      ], { calories: 420, protein: 13, carbs: 59, fat: 13, fiber: 7 }),
    },
  },
};

const createMenuRecords = (block_name) => {
  return DAYS.flatMap((day) =>
    MESS_TYPES.flatMap((mess_type) =>
      MEALS.map((mealName) => {
        const entry = DEFAULT_WEEKLY_MENU[day][mess_type][mealName];
        return {
          block_name,
          day,
          meal: mealName,
          mess_type,
          caterer: entry.caterer,
          menu_name: entry.name,
          items: entry.items,
          nutrition: entry.nutrition,
        };
      })
    )
  );
};

module.exports = {
  DAYS,
  MEALS,
  MESS_TYPES,
  DEFAULT_WEEKLY_MENU,
  createMenuRecords,
};
