const User = require('../models/User');
const TravelInfo = require('../models/TravelInfo');

exports.findMatchingUsers = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user || !user.travelStatus) {
      return res.status(404).json({ message: 'User not found or not currently traveling.' });
    }

    const userTravelInfo = await TravelInfo.findOne({ userId });
    if (!userTravelInfo) {
      return res.status(404).json({ message: 'Travel information not found.' });
    }

    const { destination, arrivalDate } = userTravelInfo;
    const startDate = new Date(arrivalDate);
    const endDate = new Date(arrivalDate);
    startDate.setDate(startDate.getDate() - 2);
    endDate.setDate(endDate.getDate() + 2);

    // Find other users with the same travelStatus, same destination, and arrival dates within ±2 days
    const matchedTravelInfos = await TravelInfo.find({
      destination,
      arrivalDate: { $gte: startDate, $lte: endDate },
      userId: { $ne: userId }
    });

    const matchedUserIds = matchedTravelInfos.map(info => info.userId);

    let matchedUsers = await User.find({
      _id: { $in: matchedUserIds },
      travelStatus: true
    }); // }).populate('hobbies fullName');

    // Prioritize users with similar hobbies
    const userHobbies = user.hobbies || [];

    matchedUsers = matchedUsers.map(match => {
      const commonHobbies = match.hobbies?.filter(hobby => userHobbies.includes(hobby)) || [];
      return {
        user: match,
        commonHobbiesCount: commonHobbies.length
      };
    });

    // Sort by the number of common hobbies (most to least)
    matchedUsers.sort((a, b) => b.commonHobbiesCount - a.commonHobbiesCount);

    res.json({
      user: user.fullName,
      destination,
      matches: matchedUsers.map(item => ({
        _id: item.user._id,
        fullName: item.user.fullName,
        avatar: item.user.avatar,
        hobbies: item.user.hobbies,
        commonHobbiesCount: item.commonHobbiesCount
      }))
    });

  } catch (err) {
    console.error('Error in findMatchingUsers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
