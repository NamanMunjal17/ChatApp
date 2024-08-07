# Scalability
The project uses the help of multiple websocket servers serving different users. It used nginx to help in load balancing
# Redis
All these messages sent are then sent to a redist pub sub model which checks whether the user is online otherwise the message is just stored otherwise its delivered on the go.
# Kafka
Kafka used to lower the latency in uploading the messages to the database
# System Design
![Sys Design](https://github.com/user-attachments/assets/f1a668b0-4b84-4daf-91ca-e3266eea94fc)
