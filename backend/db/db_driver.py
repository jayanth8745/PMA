import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    def __init__(self):
        self.client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
        self.db = self.client[os.getenv("DB_NAME", "memory_assistant")]

db = MongoDB().db