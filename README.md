<div align="center">
  
# ⚡ GridPulse BD
**Bangladesh Energy Intelligence for Grid Stress, Energy Equity, and Renewable Planning**

![GridPulse BD Banner](/public/og.png)

<br />

<a href="https://gridpulse-bd.nexameet-arnob.workers.dev/" target="_blank">
  <img src="https://img.shields.io/badge/🌐_LIVE_DEMO-Click_Here-FF4500?style=for-the-badge" alt="Live Demo" />
</a>

<br /><br />

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](#)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](#)
[![MapLibre](https://img.shields.io/badge/MapLibre-GL-orange?style=for-the-badge&logo=maplibre)](#)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-D1-F38020?style=for-the-badge&logo=cloudflare)](#)
[![Python](https://img.shields.io/badge/Machine_Learning-Python-3776AB?style=for-the-badge&logo=python)](#)
[![TensorFlow](https://img.shields.io/badge/Deep_Learning-TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow)](#)

</div>

---

## 🌍 About The Project

**GridPulse BD** is an advanced explainable AI and Machine Learning platform tailored specifically for Bangladesh. It provides critical insights into the nation's energy infrastructure by analyzing and visualizing complex data in real-time. 

Our mission is to empower policymakers, researchers, and engineers with actionable intelligence to ensure a sustainable and equitable energy future for Bangladesh.

### 🔑 Key Modules

- 🔌 **Grid Stress Monitoring & Prediction:** Real-time visualization and time-series forecasting of power grid loads to prevent blackouts.
- ⚖️ **Rural–Urban Energy Equity:** Geospatial analysis identifying disparities in energy distribution to ensure fair access across all districts.
- ☀️ **Renewable Energy Planning:** Data-driven approaches to identify optimal locations for solar and wind farms based on geographical and climate data.

---

## 🧠 Machine Learning & Deep Learning (AI)

GridPulse BD leverages state-of-the-art AI models to process massive datasets (satellite imagery, weather data, historical power consumption) and generate highly accurate predictions.

### 1. Power Load Forecasting (Grid Stress)
> Predicting future electricity demand and identifying potential points of grid failure.
- 📈 **Long Short-Term Memory (LSTM):** Used for advanced time-series forecasting of national power consumption.
- 🌲 **XGBoost & Random Forest:** To analyze the impact of non-linear variables (like temperature, humidity, and holidays) on energy demand.
- 🔮 **Facebook Prophet:** For baseline seasonal trend analysis.

### 2. Energy Equity & Distribution Analysis
> Analyzing satellite night-time light data and population density to map energy poverty.
- 🖼️ **Convolutional Neural Networks (CNNs):** Applied to VIIRS (Visible Infrared Imaging Radiometer Suite) satellite imagery to estimate rural electrification rates.
- 🎯 **K-Means Clustering & DBSCAN:** Used for spatial clustering to identify underserved communities.

### 3. Renewable Energy Site Optimization
> Finding the perfect spots for new solar and wind energy farms.
- 🤖 **U-Net Architecture:** Used for semantic segmentation of satellite images to detect available rooftops and barren lands for solar panels.
- 🕸️ **Graph Neural Networks (GNN):** For analyzing and optimizing the physical topology of the power grid to minimize transmission loss.

---

## ✨ System Features
- 🗺️ **Interactive Mapping:** Explore high-resolution, interactive geospatial energy maps powered by MapLibre and BDAtlas.
- 📊 **Explainable AI (XAI):** Not just predictions, the system explains *why* a specific prediction was made (using SHAP & LIME values).
- 🔐 **Secure Access:** Integrated authentication system for secure workspace operations and user-specific dashboards.
- ⚡ **High Performance:** Built on Cloudflare Edge infrastructure ensuring lightning-fast load times.

---

## 🚀 Technologies Used

<div align="center">

| Area | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js (Vinext), React 19 |
| **Styling** | Tailwind CSS v4 |
| **Mapping & GIS** | MapLibre GL, BDAtlas |
| **Backend & Database** | Drizzle ORM, Cloudflare D1 (SQLite) |
| **AI / ML Stack** | TensorFlow, PyTorch, Scikit-Learn, Pandas |
| **Deployment** | Cloudflare Workers / Pages |

</div>

---

<br />
<div align="center">
  <i>Developed with ❤️ for Bangladesh</i>
</div>
