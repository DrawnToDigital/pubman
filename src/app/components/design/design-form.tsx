'use client';

import React, { useState } from "react";
import { createDesign } from "@/src/app/actions/design";
import { useRouter } from "next/navigation";

const DesignForm = () => {
  const [formData, setFormData] = useState({
    main_name: "",
    description: "",
    summary: "",
    tags: "",
    category: "",
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await createDesign(formData);
      console.log("Design created successfully:", data);
      router.push(`/design/${data["design_key"]}`);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="main_name" style={{ marginBottom: "0.5rem" }}>
          Main Name
        </label>
        <input
          type="text"
          id="main_name"
          name="main_name"
          placeholder="Enter main name"
          value={formData.main_name}
          onChange={handleChange}
          required
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="summary" style={{ marginBottom: "0.5rem" }}>
          Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          placeholder="Enter summary"
          value={formData.summary}
          onChange={handleChange}
          required
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            minHeight: "100px",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="description" style={{ marginBottom: "0.5rem" }}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Enter description"
          value={formData.description}
          onChange={handleChange}
          required
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            minHeight: "100px",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="tags" style={{ marginBottom: "0.5rem" }}>
          Tags
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          placeholder="Enter tags (comma-separated)"
          value={formData.tags}
          onChange={handleChange}
          required
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <label htmlFor="category" style={{ marginBottom: "0.5rem" }}>
          Category
        </label>
        <input
          type="text"
          id="category"
          name="category"
          placeholder="Enter category"
          value={formData.category}
          onChange={handleChange}
          required
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "0.75rem",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Submit
      </button>
    </form>
  );
};

export default DesignForm;