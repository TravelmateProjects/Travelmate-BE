// Alternative auth config for development (Backend on server, Frontend local)
// Returns tokens in response instead of cookies for easier development

exports.loginDev = async (req, res) => {
  const { username, password, platform } = req.body;
  
  try {
    const account = await Account.findOne({ username }).populate('userId');
    if (!account || !account.accountStatus) {
      return res.status(401).json({ message: 'Invalid login information or your account locked' });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const payload = {
      accountId: account._id,
      role: account.role
    };

    if (account.role !== 'admin') {
      payload.userId = account.userId._id;
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    // Return tokens in response for development (easier for localhost → EC2)
    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      account: {
        id: account._id,
        username: account.username,
        role: account.role,
        userId: account.userId ? account.userId._id : undefined,
      },
      user: account.userId || undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { loginDev };
