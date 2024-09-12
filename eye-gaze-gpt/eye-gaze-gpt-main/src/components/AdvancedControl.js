import React, { useState, useEffect } from 'react';
import Switch from '@mui/material/Switch';

export function AdvancedControl({
    ttsParams,
    setTtsParams,
    TrackButtons,
    trackEvent
}) {
    const [groupedParams, setGroupedParams] = useState({});
    const [positions, setPositions] = useState({});
    const [animatedPositions, setAnimatedPositions] = useState({});
    const [animatedValues, setAnimatedValues] = useState({});
    const [targetValues, setTargetValues] = useState({});
    const [animationEnabled, setAnimationEnabled] = useState(true);

    const animationRate = animationEnabled ? 0.1 : 1;

    useEffect(() => {
        if (Object.keys(ttsParams).length === 0) return;

        // Group parameters by their 'group' property
        const grouped = Object.keys(ttsParams).reduce((acc, key) => {
            const param = ttsParams[key];
            if (!acc[param.group]) {
                acc[param.group] = {};
            }
            acc[param.group][key] = param;
            return acc;
        }, {});

        console.log('Grouped Params:', grouped);

        // Initial positions for each group based on default values
        const initialPositions = Object.keys(grouped).reduce((acc, group) => {
            const params = grouped[group];
            const xParamKey = Object.keys(params)[0];
            const yParamKey = Object.keys(params)[1];
            const xPercent = (params[xParamKey].default - params[xParamKey].min) / (params[xParamKey].max - params[xParamKey].min);
            const yPercent = (params[yParamKey].default - params[yParamKey].min) / (params[yParamKey].max - params[yParamKey].min);
            acc[group] = [50 + xPercent * 400, 450 - yPercent * 400];
            return acc;
        }, {});

        // Initial animated values for each group
        const initialAnimatedValues = Object.keys(grouped).reduce((acc, group) => {
            acc[group] = Object.keys(grouped[group]).reduce((innerAcc, key) => {
                innerAcc[key] = grouped[group][key].default;
                return innerAcc;
            }, {});
            return acc;
        }, {});

        console.log('Initial Positions:', initialPositions);
        console.log('Initial Animated Values:', initialAnimatedValues);

        //add value field to all params in ttsparams only if value isnt already there
    
        Object.keys(ttsParams).forEach(key => {
            if (!ttsParams[key].value) {
                ttsParams[key].value = ttsParams[key].default;
            }
        });

        setTtsParams(ttsParams);

        setGroupedParams(grouped);
        setPositions(initialPositions);
        setAnimatedPositions(initialPositions);
        setAnimatedValues(initialAnimatedValues);
        setTargetValues(initialAnimatedValues);
    }, [ttsParams]);

    const handleGraphClick = (event, group) => {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const params = groupedParams[group];

        var xPercent = (x - 50) / 400;
        var yPercent = 1 - (y - 50) / 400;

        console.log('Graph Click:', { x, y, xPercent, yPercent, group, params });

        if (x >= 50 && x <= 450 && y >= 50 && y <= 450) {
            trackEvent(`${group}_graph_click`, { x, y, xPercent, yPercent });
            TrackButtons(`${group}GraphClicked`);

            setAnimatedPositions(prev => ({ ...prev, [group]: [x, y] }));

            const updatedValues = Object.keys(params).reduce((acc, key) => {
                const param = params[key];
                acc[key] = param.min + (param.max - param.min) * (key === Object.keys(params)[0] ? xPercent : yPercent);
                return acc;
            }, {});

            console.log('Updated Values:', updatedValues);

            for (const key in updatedValues) {
                ttsParams[key].value = updatedValues[key];
            }

            setTtsParams(ttsParams);

            setTargetValues(prev => ({
                ...prev,
                [group]: updatedValues
            }));
        }
    };

    useEffect(() => {
        if (!Object.keys(animatedPositions).length) return;

        console.log('useEffect for positions and animatedPositions');
        const animationInterval = setInterval(() => {
            setPositions(prev => Object.keys(prev).reduce((acc, group) => {
                acc[group] = [
                    prev[group][0] + (animatedPositions[group][0] - prev[group][0]) * animationRate,
                    prev[group][1] + (animatedPositions[group][1] - prev[group][1]) * animationRate
                ];
                return acc;
            }, {}));
        }, 16);

        return () => clearInterval(animationInterval);
    }, [animatedPositions, animationRate]);

    useEffect(() => {
        if (!Object.keys(targetValues).length) return;

        console.log('useEffect for targetValues');
        const animationInterval = setInterval(() => {
            setAnimatedValues(prev => Object.keys(prev).reduce((acc, group) => {
                const params = groupedParams[group];
                acc[group] = Object.keys(params).reduce((innerAcc, key) => {
                    innerAcc[key] = prev[group][key] + (targetValues[group][key] - prev[group][key]) * animationRate;
                    return innerAcc;
                }, {});
                return acc;
            }, {}));
        }, 16);

        return () => clearInterval(animationInterval);
    }, [targetValues, animationRate]);

    const handleAnimationToggle = () => {
        TrackButtons("AnimationsToggled");
        trackEvent("animation_toggle", { enabled: !animationEnabled });
        setAnimationEnabled(prev => !prev);
    };

    if (!Object.keys(groupedParams).length) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', width: '100%' }}>
            
                {Object.keys(groupedParams).map((group, index) => {
                    const groupKeys = Object.keys(groupedParams[group]);
                    const xParamKey = groupKeys[0];
                    const yParamKey = groupKeys[1];
                    return (
                            <div key={group} style={{ position: 'relative', width: '50%', height: '500px', marginRight: '20px' }} onClick={(e) => handleGraphClick(e, group)}>
                                <svg width="100%" height="100%">
                                    <g>
                                        {/* Horizontal dotted line */}
                                        <line x1="50" y1={positions[group][1]} x2="450" y2={positions[group][1]} stroke="#ccc" strokeWidth="4" strokeDasharray="7" />
                                        {/* Vertical dotted line */}
                                        <line x1={positions[group][0]} y1="50" x2={positions[group][0]} y2="450" stroke="#ccc" strokeWidth="4" strokeDasharray="7" />
                                        <circle cx={positions[group][0]} cy={positions[group][1]} r="10" fill="red" />
                                    </g>
                                    {/* X-axis */}
                                    <line x1="50" y1="450" x2="450" y2="450" stroke="black" />
                                    <text x="250" y="470" style={{ fontSize: '20px', textAnchor: 'middle' }}>
                                        {ttsParams[xParamKey].displayName}: {animatedValues[group][xParamKey].toFixed(2)}
                                    </text>
                                    {/* Top line */}
                                    <line x1="50" y1="50" x2="450" y2="50" stroke="black" />
                                    {/* Y-axis */}
                                    <line x1="50" y1="50" x2="50" y2="450" stroke="black" />
                                    <text x="20" y="250" style={{ fontSize: '20px', textAnchor: 'middle', writingMode: 'vertical-rl' }}>
                                        {ttsParams[yParamKey].displayName}: {animatedValues[group][yParamKey].toFixed(2)}
                                    </text>
                                    {/* Right line */}
                                    <line x1="450" y1="50" x2="450" y2="450" stroke="black" />
                                </svg>
                            </div>
                    );
                })}
            
            <div style={{ marginTop: '20px' }}>
                <Switch
                    checked={animationEnabled}
                    onChange={handleAnimationToggle}
                    inputProps={{ 'aria-label': 'controlled' }}
                />
                <span>Animations</span>
            </div>
        </div>
    );
};

export default AdvancedControl;
