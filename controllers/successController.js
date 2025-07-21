// controllers/successController.js

exports.successPage = (req, res) => {
    const sessionId = req.query.session_id;
  
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Thanh toán thành công</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              text-align: center;
              padding: 50px;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              max-width: 500px;
              margin: auto;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            h2 {
              color: #28a745;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🎉 Thanh toán thành công!</h2>
            <p>Cảm ơn bạn đã nâng cấp. Vui lòng quay lại ứng dụng để kiểm tra trạng thái Pro của bạn.</p>
          </div>
  
          <script>
            (async () => {
              const sessionId = ${JSON.stringify(sessionId)};
              if (sessionId) {
                try {
                  await fetch('/stripe/verify-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                  });
                } catch (err) {
                  console.error('Lỗi xác nhận session:', err);
                }
              }
            })();
          </script>
        </body>
      </html>
    `);
  };
  