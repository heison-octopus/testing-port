import React, { useState, useEffect } from 'react';
export default function Field({
  label,
  children,
  ...props
}) {
  return <label>{label}{children || <input {...props} />}</label>;
}
