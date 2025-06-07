const SMSLog = require('../models/smsLog');

// Get SMS analytics for different time periods
exports.getSMSAnalytics = async (req, res) => {
  try {
    // Get today's date at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get date 7 days ago
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);
    
    // Get first day of current month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    // Today's statistics
    const todayStats = await getStatsByDateRange(today, new Date());
    
    // Last 7 days statistics
    const last7DaysStats = await getStatsByDateRange(last7Days, new Date());
    
    // This month statistics
    const thisMonthStats = await getStatsByDateRange(firstDayOfMonth, new Date());
    
    // All time statistics
    const allTimeStats = await getAllTimeStats();
    
    res.status(200).json({
      success: true,
      data: {
        today: todayStats,
        last7Days: last7DaysStats,
        thisMonth: thisMonthStats,
        allTime: allTimeStats
      }
    });
    
  } catch (error) {
    console.error('Error fetching SMS analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS analytics',
      error: error.message
    });
  }
};

// Get daily SMS count for the last 30 days
exports.getDailySMSCount = async (req, res) => {
  try {
    // Get date 30 days ago
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    last30Days.setHours(0, 0, 0, 0);
    
    // Aggregate daily counts
    const dailyCounts = await SMSLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1
        }
      }
    ]);
    
    // Format the results
    const formattedResults = {};
    dailyCounts.forEach(item => {
      const date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      
      if (!formattedResults[date]) {
        formattedResults[date] = { sent: 0, failed: 0, total: 0 };
      }
      
      formattedResults[date][item._id.status] = item.count;
      formattedResults[date].total += item.count;
    });
    
    res.status(200).json({
      success: true,
      data: formattedResults
    });
    
  } catch (error) {
    console.error('Error fetching daily SMS count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily SMS count',
      error: error.message
    });
  }
};

// Helper function to get statistics by date range
async function getStatsByDateRange(startDate, endDate) {
  // Get total count
  const totalCount = await SMSLog.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  // Get sent count
  const sentCount = await SMSLog.countDocuments({
    status: 'sent',
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  // Get failed count
  const failedCount = await SMSLog.countDocuments({
    status: 'failed',
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  // Get counts by message type
  const typeCounts = await SMSLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$messageType",
        count: { $sum: 1 }
      }
    }
  ]);
  
  const messageTypes = {};
  typeCounts.forEach(type => {
    messageTypes[type._id] = type.count;
  });
  
  return {
    total: totalCount,
    sent: sentCount,
    failed: failedCount,
    successRate: totalCount > 0 ? (sentCount / totalCount * 100).toFixed(2) + '%' : '0%',
    messageTypes
  };
}

// Helper function to get all time statistics
async function getAllTimeStats() {
  // Get total count
  const totalCount = await SMSLog.countDocuments({});
  
  // Get sent count
  const sentCount = await SMSLog.countDocuments({ status: 'sent' });
  
  // Get failed count
  const failedCount = await SMSLog.countDocuments({ status: 'failed' });
  
  // Get counts by message type
  const typeCounts = await SMSLog.aggregate([
    {
      $group: {
        _id: "$messageType",
        count: { $sum: 1 }
      }
    }
  ]);
  
  const messageTypes = {};
  typeCounts.forEach(type => {
    messageTypes[type._id] = type.count;
  });
  
  return {
    total: totalCount,
    sent: sentCount,
    failed: failedCount,
    successRate: totalCount > 0 ? (sentCount / totalCount * 100).toFixed(2) + '%' : '0%',
    messageTypes
  };
} 