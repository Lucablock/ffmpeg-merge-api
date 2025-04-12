FROM node:18

# ติดตั้ง ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# ตั้ง working directory
WORKDIR /app

# คัดลอก package* ก่อนเพื่อ cache layer
COPY package*.json ./
RUN npm install

# คัดลอกโค้ดทั้งหมด
COPY . .

# เปิด port
EXPOSE 3000

# รัน server
CMD ["node", "server.js"]
