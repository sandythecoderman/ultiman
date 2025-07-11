import React, { useState, useEffect } from 'react';

const DynamicForm = ({ schema, initialData, onUpdate }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Initialize form data with initialData or defaults from schema
    const initial = {};
    schema.forEach(field => {
      initial[field.name] = initialData[field.name] || '';
    });
    setFormData(initial);
  }, [schema, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    onUpdate(newFormData); // Inform parent of the change
  };

  return (
    <form className="dynamic-form">
      {schema.map(field => {
        const { name, label, type, options } = field;
        
        switch (type) {
          case 'textarea':
            return (
              <div key={name} className="form-field">
                <label htmlFor={name}>{label}</label>
                <textarea id={name} name={name} value={formData[name] || ''} onChange={handleChange} />
              </div>
            );
          case 'select':
            return (
              <div key={name} className="form-field">
                <label htmlFor={name}>{label}</label>
                <select id={name} name={name} value={formData[name] || ''} onChange={handleChange}>
                  <option value="">Select...</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            );
          default: // 'text', 'email', etc.
            return (
              <div key={name} className="form-field">
                <label htmlFor={name}>{label}</label>
                <input type={type} id={name} name={name} value={formData[name] || ''} onChange={handleChange} />
              </div>
            );
        }
      })}
    </form>
  );
};

export default DynamicForm; 