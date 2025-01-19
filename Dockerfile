FROM node:slim
 
WORKDIR /app
COPY . .
RUN npm ci
 
RUN npm run build

ARG PORT
EXPOSE ${PORT:-3000}
 
CMD ["npm", "run", "start"]