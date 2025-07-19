const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Hoặc SMTP khác nếu bạn dùng dịch vụ khác
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendProSuccessMail = async (to, fullName, plan, expireAt) => {
  const subject = 'Xác nhận nâng cấp Pro thành công';
  const html = `
    <div style="font-family: Arial, sans-serif; background: #f6f6f6; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px 24px;">
        <div style="text-align:center; margin-bottom: 24px;">
          <img src="https://res.cloudinary.com/dvoyjeco3/image/upload/v1748492096/Assets/Images/w4gsxcmtnq5sinujgmwd.png" alt="Travelmate Logo" style="width: 180px; height: 60px; object-fit: contain; margin-bottom: 8px;" />
          <h2 style="color: #2a7be4; margin: 0;">Chúc mừng bạn đã nâng cấp Pro!</h2>
        </div>
        <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Xin chào <b>${fullName}</b>,</p>
        <p style="font-size: 16px; color: #222; margin-bottom: 18px;">Bạn đã nâng cấp thành công gói <b>Pro</b> (${plan === 'year' ? '1 năm' : '1 tháng'}).</p>
        <div style="text-align:center; margin: 32px 0;">
          <span style="display:inline-block; font-size: 20px; letter-spacing: 2px; color: #fff; background: #2a7be4; padding: 12px 32px; border-radius: 8px; font-weight: bold;">Thời hạn Pro đến: ${expireAt ? new Date(expireAt).toLocaleDateString() : ''}</span>
        </div>
        <p style="font-size: 15px; color: #555;">Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của Travelmate.<br>Chúc bạn có những trải nghiệm tuyệt vời!</p>
        <div style="margin-top: 32px; text-align:center; color: #aaa; font-size: 13px;">&copy; ${new Date().getFullYear()} Travelmate</div>
      </div>
    </div>
  `;
  console.log('[MAILER] Chuẩn bị gửi mail Pro:', { to, fullName, plan, expireAt });
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log('[MAILER] Gửi mail thành công:', info.response || info);
  } catch (err) {
    console.error('[MAILER] Lỗi gửi mail:', err);
    throw err;
  }
}; 