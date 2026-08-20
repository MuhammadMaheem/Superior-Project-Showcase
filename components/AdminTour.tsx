"use client";

import { useEffect } from "react";
import { driver } from "driver.js";

export function AdminTour() {
  useEffect(() => {
    const startTour = () => {
      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        nextBtnText: "Next Step →",
        prevBtnText: "← Back",
        doneBtnText: "Finish Tour",
        steps: [
          {
            element: "#tour-overview-stats",
            popover: {
              title: "🎓 Admin Command Center",
              description:
                "Welcome to the Superior Super-Admin platform. Here you can monitor project submissions, faculty workloads, and unresolved student queries in real time.",
              side: "bottom",
              align: "start",
            },
          },
          {
            element: "#tour-nav-projects",
            popover: {
              title: "📁 Project Management & Moderation",
              description:
                "Browse all submitted student projects. Toggle visibility between Published and Hidden, edit fields inline, or enrich GitHub metadata if a student had private repos.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-nav-teachers",
            popover: {
              title: "🔄 24h Faculty Sync & Inline Diffs",
              description:
                "Review updates staged by the automated 24h sync engine. Fix typos (e.g. 'Thoery' → 'Theory') directly before clicking Approve to commit to the live Teachers tab.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-nav-queries",
            popover: {
              title: "💬 Student Queries & Linked Context",
              description:
                "View student edit requests. When a student selects their project, full project context appears inline so you don't have to search manually.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-nav-audit",
            popover: {
              title: "🛡️ Audit Trail & Security",
              description:
                "Every administrative action, approval, edit, and moderation decision is timestamped and recorded in the append-only audit log.",
              side: "right",
              align: "start",
            },
          },
        ],
      });

      driverObj.drive();
    };

    // Listen for manual trigger event
    window.addEventListener("start-admin-tour", startTour);

    // Auto trigger once on first session
    const hasSeenTour = localStorage.getItem("superior_admin_tour_seen");
    if (!hasSeenTour) {
      setTimeout(() => {
        startTour();
        localStorage.setItem("superior_admin_tour_seen", "true");
      }, 800);
    }

    return () => {
      window.removeEventListener("start-admin-tour", startTour);
    };
  }, []);

  return null;
}
