import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import PersonalArea from "./pages/PersonalArea";
import Chat from "./pages/Chat";
import DownloadApp from "./pages/DownloadApp";
import Video from "./pages/Video";
import AuthForm from "./pages/AuthForm"; // ✅ Use AuthForm for both login & signup
import Main from "./pages/Main";
import Manager from "./pages/Manager";
import RealChat from "./pages/RealChat";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Support from "./pages/support.jsx";
//import Chat from "./components/TravelPlanner/TravelPlannerApp.jsx";




 
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Header />  {/* Header component */}
       
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<AuthForm isLogin={true} />} />
            <Route path="/signup" element={<AuthForm isLogin={false} />} />
            <Route path="/personal-area" element={<PersonalArea />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/manager" element={<Manager />} />
            <Route path="/downloadApp" element={<DownloadApp />} />
            <Route path="/video" element={<Video />} />
            <Route path="/main" element={<Main />} />
            <Route path="/realChat" element={<RealChat />} />
            <Route path="/support" element={<Support />} />

          </Routes>
        </div>

        <Footer />  {/* Footer component */}
      </Router>
    </ErrorBoundary>
  );
}

 
export default App;