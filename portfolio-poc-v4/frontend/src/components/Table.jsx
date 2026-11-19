import React, { useState, useEffect } from 'react';
export default function Table({
  columns,
  rows,
  render
}) {
  return <div className="table-scroll"><table><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(render)}</tbody></table>{!rows.length && <p className="muted">No records yet.</p>}</div>;
}
