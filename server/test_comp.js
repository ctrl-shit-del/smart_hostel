const axios = require('axios');

async function checkComplaints() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      username: 'warden_a',
      password: 'password',
      loginCategory: 'warden'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in as Warden.');

    const statsRes = await axios.get('http://localhost:5000/api/v1/complaints/analytics/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Stats:', statsRes.data);

    const allComplaintsRes = await axios.get('http://localhost:5000/api/v1/complaints', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`All Complaints count: ${allComplaintsRes.data.complaints.length}`);

    const raggingComplaintsRes = await axios.get('http://localhost:5000/api/v1/complaints?category=Ragging+%2F+Harassment', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Ragging Complaints count: ${raggingComplaintsRes.data.complaints.length}`);

  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
checkComplaints();
