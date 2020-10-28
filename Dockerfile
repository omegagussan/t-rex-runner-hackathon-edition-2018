FROM python:3.9

USER root
RUN apt-get update
COPY requirements.txt .
RUN pip install -r requirements.txt
WORKDIR /home/app/src

COPY src /home/app/src
COPY game /home/app/game

EXPOSE 3000
CMD ["python", "-m", "server"]
