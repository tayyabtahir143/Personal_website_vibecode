# Use a small Node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the initial blog feed (data/posts.json)
RUN npm run build:posts

# Runtime env
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# The app listens on 4000 (per README)
EXPOSE 4000

# Start API + frontend
CMD ["npm", "run", "start"]

