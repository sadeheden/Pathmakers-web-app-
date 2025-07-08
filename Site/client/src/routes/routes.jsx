import React from "react";
import { createBrowserRouter } from "react-router-dom";
 
// Import all pages directly
import HomePage from "../pages/HomePage";
import AboutPage from "../pages/AboutPage";
import Chat from "../pages/Chat";
import Login from "../pages/Login";
import PersonalArea from "../pages/PersonalArea";
import Video from "../pages/Video";
import DownloadApp from "../pages/DownloadApp";
import Signup from "../pages/Signup";
import Main from "../pages/Main";
import NotFound from "../pages/NotFound"; // Custom 404 Page
import Manager from "../pages/Manager";
import RealChat from "../pages/RealChat";
import Support from "../pages/support";

 
 
export const Router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "/chat", element: <Chat /> },
  { path: "/main", element: <Main /> },
  { path: "/login", element: <Login /> },
  { path: "/personal-area", element: <PersonalArea /> },
  { path: "/video", element: <Video /> },
  { path: "/downloadApp", element: <DownloadApp /> },
  { path: "/signup", element: <Signup /> },
  { path: "/manager", element: <Manager /> },
  { path: "/realChat", element: <RealChat /> },
  { path: "/support", element: <Support /> },
  <Route path="/manager" element={<Manager />} />

 
  { path: "*", element: <NotFound /> }, // Handles unmatched routes
]);
 