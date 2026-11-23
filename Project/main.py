
import joblib
import pandas as pd

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


# =====================================
# 1. BASE DIRECTORY AND MODEL LOADING
# =====================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "Mental_Heath_Model.pkl"

model = joblib.load(MODEL_PATH)


# =====================================
# 2. FASTAPI APP
# =====================================

app = FastAPI()


# =====================================
# 3. STATIC FILES AND TEMPLATES
# =====================================

app.mount(
    "/static",
    StaticFiles(directory=BASE_DIR / "static"),
    name="static"
)

templates = Jinja2Templates(
    directory=BASE_DIR / "templates"
)


# =====================================
# 4. CORS CONFIGURATION
# =====================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================
# 5. COUNTRY GROUPS
# =====================================

top_countries = [
    'Other', 'India', 'USA', 'Canada', 'Australia',
    'UK', 'Germany', 'Mexico', 'Turkey', 'France'
]


# =====================================
# 6. INPUT PYDANTIC MODEL
# =====================================

class studentData(BaseModel):

    age: int = Field(..., ge=10, le=100)

    gender: Literal['Male', 'Female']

    country: str

    academic_level: Literal[
        'Undergraduate', 'Graduate', 'High School'
    ]

    most_used_platform: Literal[
        'Facebook', 'LinkedIn', 'Instagram', 'Snapchat',
        'Twitter', 'YouTube', 'TikTok', 'LINE',
        'KakaoTalk', 'VKontakte', 'WhatsApp', 'WeChat'
    ]

    purpose_of_use: Literal[
        'Networking', 'Education', 'Entertainment', 'News'
    ]

    avg_daily_usage_hours: float = Field(..., ge=0, le=24)

    daily_unlocks: int = Field(..., ge=0)

    study_hours: float = Field(..., ge=0, le=24)

    physical_activity_hours: float = Field(..., ge=0, le=24)

    sleep_hours_per_night: float = Field(..., ge=0, le=24)

    stress_level: Literal[
        'Medium', 'Low', 'Very High', 'High'
    ]


# =====================================
# 7. PREDICTION RESPONSE
# =====================================

class PredictionResponse(BaseModel):

    predicted_mental_health_score: float


# =====================================
# 8. HOME ROUTE
# =====================================

@app.get("/")
def greet(request: Request):

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"request": request}
    )


# =====================================
# 9. PREDICTION ROUTE
# =====================================

@app.post('/predict', response_model=PredictionResponse)
def predict(data: studentData):

    country_group = (
        data.country
        if data.country in top_countries
        else "Other"
    )

    input_df = pd.DataFrame([{

        'Age': data.age,

        'Gender': data.gender,

        'Country': data.country,

        'Academic_Level': data.academic_level,

        'Most_Used_Platform': data.most_used_platform,

        'Purpose_Of_Use': data.purpose_of_use,

        'Avg_Daily_Usage_Hours': data.avg_daily_usage_hours,

        'Daily_Unlocks': data.daily_unlocks,

        'Study_Hours': data.study_hours,

        'Physical_Activity_Hours': data.physical_activity_hours,

        'Sleep_Hours_Per_Night': data.sleep_hours_per_night,

        'Stress_Level': data.stress_level,

        'Grouped_country': country_group

    }])

    prediction = model.predict(input_df)[0]

    return PredictionResponse(
        predicted_mental_health_score=round(float(prediction), 2)
    )
