import React from "react";
import { Switch } from "@mui/material";

const ToggleSwitch = ({ checked, onChange, label }) => (
  <div className="toggle-switch">
    <Switch checked={checked} onChange={onChange} color="primary" inputProps={{ 'aria-label': `toggle ${label}` }} />
    <span>{label}</span>
  </div>
);

export default ToggleSwitch;
