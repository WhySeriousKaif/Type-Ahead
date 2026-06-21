# ==========================================
# STAGE 1: Build React Frontend
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Spring Boot Backend
# ==========================================
FROM maven:3.8.8-eclipse-temurin-17 AS backend-builder
WORKDIR /app

# Copy React build from Stage 1 to match the relative path "../frontend/dist" in pom.xml
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/

# Copy the backend files
COPY backend-java/pom.xml ./backend-java/
COPY backend-java/src ./backend-java/src/

# Package the application
WORKDIR /app/backend-java
RUN mvn clean package -DskipTests

# ==========================================
# STAGE 3: Production Runner
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-builder /app/backend-java/target/searchiq-backend-1.0.0.jar app.jar

# Expose port (Render/Railway will bind to PORT environment variable dynamically)
EXPOSE 3002

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
