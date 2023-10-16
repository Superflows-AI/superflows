# Dockerfile

# Use node alpine as it's a small node image
FROM node:alpine 
RUN mkdir -p /app
# Set /app as the working directory
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Copy package.json and package-lock.json
# to the /app working directory
COPY package*.json ./
# Install dependencies in /app
RUN npm i && npm cache clean --force
# Copy the rest of our Next.js folder into /app
COPY . /app
# remove .env file if it exists
RUN rm -f .env

EXPOSE 3000
CMD ["npm", "run", "dev"]
