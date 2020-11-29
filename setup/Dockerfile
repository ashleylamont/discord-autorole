FROM ubuntu
RUN apt-get update && apt-get install -y postgresql-client
RUN mkdir /app
WORKDIR /app
COPY setup.sh setup.sh
COPY schema.sql schema.sql
RUN chmod +x setup.sh
CMD ["bash", "setup.sh"]