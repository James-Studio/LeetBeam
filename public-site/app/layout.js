import "./globals.css";

export const metadata = {
  title: "LeetBeam | Elegant LeetCode Progress Tracking",
  description:
    "LeetBeam is a local-first Chrome extension for tracking LeetCode progress, reviewing daily momentum, and generating optional AI interview coaching."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="page-bg" />
        {children}
      </body>
    </html>
  );
}
