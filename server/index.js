import express from 'express';
const app = express();

// PORT = 3000
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`Server đang chạy (listening) tại http://localhost:${PORT}`);
});