import SrsApprovalModal from "../../components/modals/SrsApprovalModal.jsx";

import { useState } from "react";

export default function SrsPage() {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setApproved(true);
    setShowApprovalModal(false);
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#1F2937] dark:text-gray-200">



      {/* MAIN */}
      <main className="max-w-screen-2xl mx-auto p-6">
        {/* BREADCRUMBS */}
        <div className="flex items-center gap-2 text-sm text-[#57499c] dark:text-indigo-300 mb-4">
          <span>Projects</span> / <span>AI Shopping App</span> /{" "}
          <span className="text-[#100d1c] dark:text-white">SRS Document</span>
        </div>

        {/* PAGE HEADER */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-4xl font-black">
            Software Requirements Specification
          </h1>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-white/10">


            <div className="relative group">
              <button className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">
                <span className="material-symbols-outlined text-lg">
                  download
                </span>
                Export
                <span className="material-symbols-outlined text-lg transition-transform group-hover:rotate-180">
                  expand_more
                </span>
              </button>

              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-background-dark rounded-lg shadow-lg border opacity-0 invisible group-hover:visible group-hover:opacity-100">
                {["Doc", "PDF"].map((f) => (
                  <a
                    key={f}
                    href="#"
                    className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-primary/20"
                  >
                    Export as {f}
                  </a>
                ))}
              </div>
            </div>
           <button
              onClick={() => setShowApprovalModal(true)}
              disabled={approved}
              className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                ${approved ? "bg-green-600" : "bg-primary hover:opacity-90"}`}
            >
              <span className="material-symbols-outlined">
                {approved ? "check_circle" : "approval"}
              </span>
              {approved ? "Approved" : "Approve"}
            </button>
          </div>
        </div>


        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
{/* SIDEBAR */}
<aside className="lg:col-span-1 lg:sticky lg:top-24 self-start">
  <div className="flex flex-col gap-4 bg-white dark:bg-background-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700">

    {/* table of contents Header */}
    <div className="flex gap-3 items-center">
      <div
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
        style={{
          backgroundImage:
            'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBX1ZkQlJe9SdZoJF_p5DvL0-a90B3KElMgD2TCMULFJ8tBrSopwlEZg-risqSzidwSus_bK3hyB5rm6jNpxbXlUimIzANb8rzFovJ-mhA3eabXAKZ2j-O6OLQlulOgXIWEJaQ5Pp7IyapKvXpQHd4RzYoslxneKUHa4l8K0uD51klD8t6Y2Q_GG-gj2PQRodbUDwPochZt8N3tMzIxWUsKWe7yRi-nnr23_WLRwB3MaKmXiUDoPl0oe-lgaic6bENEd6QhrxuX5uGW")',
        }}
      />

      <div className="flex flex-col">
        <h2 className="text-[#100d1c] dark:text-white text-base font-medium">
          Table of Contents
        </h2>
        <p className="text-[#57499c] dark:text-indigo-300 text-sm">
          AI Shopping App
        </p>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex flex-col gap-1">

      <a
        href="#introduction"
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 dark:bg-primary/20"
      >
        <span className="material-symbols-outlined text-lg text-primary dark:text-indigo-300">
          description
        </span>
        <p className="text-primary dark:text-indigo-300 text-sm font-bold">
          1. Introduction
        </p>
      </a>

      <a
        href="#purpose"
        className="flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/10"
      >
        <p className="text-[#100d1c] dark:text-white text-sm font-medium">
          1.1 Purpose
        </p>
      </a>

      <a
        href="#description"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/10"
      >
        <span className="material-symbols-outlined text-lg text-[#100d1c] dark:text-white">
          table_rows
        </span>
        <p className="text-[#100d1c] dark:text-white text-sm font-medium">
          2. Overall Description
        </p>
      </a>

      <a
        href="#features"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/10"
      >
        <span className="material-symbols-outlined text-lg text-[#100d1c] dark:text-white">
          list
        </span>
        <p className="text-[#100d1c] dark:text-white text-sm font-medium">
          3. System Features
        </p>
      </a>

      <a
        href="#functional"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/10"
      >
        <span className="material-symbols-outlined text-lg text-[#100d1c] dark:text-white">
          toggle_on
        </span>
        <p className="text-[#100d1c] dark:text-white text-sm font-medium">
          4. Functional Requirements
        </p>
      </a>

      <a
        href="#non-functional"
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-primary/10"
      >
        <span className="material-symbols-outlined text-lg text-[#100d1c] dark:text-white">
          security
        </span>
        <p className="text-[#100d1c] dark:text-white text-sm font-medium">
          5. Non-Functional
        </p>
      </a>

    </nav>
  </div>
</aside>


          {/* DOCUMENT */}
          <article className="lg:col-span-3 bg-white dark:bg-background-dark p-10 rounded-xl shadow border space-y-10">
            <section id="introduction" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                This document outlines the Software Requirements Specification (SRS) for the AI Shopping App. It provides a comprehensive description of the system's purpose, features, and functionalities, serving as a guiding document for development, testing, and project management teams.
              </p>
            </section>
            <section id="purpose" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                1.1 Purpose
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                The primary purpose of the AI Shopping App is to provide users with a personalized and intelligent shopping experience. The app will leverage artificial intelligence to offer tailored product recommendations, streamline the checkout process, and provide virtual try-on features for apparel. This SRS aims to define these requirements clearly to ensure the final product meets user expectations and business goals.</p>
            </section>
            
            <section id="description" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                2. Overall Description
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                The AI Shopping App is a mobile-first e-commerce platform designed for modern consumers. It integrates with various retailers and provides a unified interface for browsing, searching, and purchasing products. Key differentiators include an AI-powered recommendation engine, augmented reality (AR) for virtual product visualization, and a conversational AI assistant for customer support.</p>
            </section>


            <section id="features" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                3. System Features
              </h2>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                <li>Personalized User Dashboard</li>
                <li>AI-Powered Product Recommendations</li>
                <li>Advanced Search with Natural Language Processing</li>
                <li>Augmented Reality (AR) Virtual Try-On</li>
                <li>Secure and Seamless Checkout Process</li>
                <li>Order Tracking and Management</li>
                <li>AI Chatbot for Customer Support</li>
              </ul>
            </section>

            <section id="functional" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                4. Functional Requirements
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                The system shall allow users to create and manage their profiles, browse products by category, and receive recommendations based on their browsing history. Detailed functional requirements are documented in the internal project backlog.</p>
            </section>

           <section id="non-functional" className="scroll-mt-28 space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2">
                5. Non-Functional Requirements
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
            The system must ensure high availability (99.9%), rapid response times for search queries (under 500ms), and adhere to industry-standard encryption protocols for all user data and transaction information.</p>
            </section>
          </article>
        </div>
      </main>


      {/* MODAL */}
      {showApprovalModal && (
        <SrsApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
