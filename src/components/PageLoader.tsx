'use client'

import React from "react";
import { motion } from "framer-motion";

interface PageLoaderProps {
  icon?: string;
  text?: string;
  fullScreen?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  icon = "🌱",
  text = "جاري التحميل...",
  fullScreen = true,
}) => {
  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        color: "var(--ghrs-text-primary)",
      }}
    >
      <motion.span
        style={{ fontSize: "48px", display: "block" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon}
      </motion.span>
      <p style={{ fontSize: "16px", margin: 0 }}>{text}</p>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ghrs-bg-primary)",
        zIndex: 9999,
      }}
    >
      {content}
    </div>
  );
};

export default PageLoader;
