const express = require('express');
const router = express.Router();

router.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Thanh toán thất bại</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; text-align: center; padding: 50px; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          h2 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Thanh toán thất bại!</h2>
          <p>Bạn đã huỷ thanh toán hoặc có lỗi xảy ra. Vui lòng quay lại ứng dụng để thử lại.</p>
        </div>
        <script>
          setTimeout(function() {
            window.location = 'travelmate://payment-cancel';
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

module.exports = router; 