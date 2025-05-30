
import React from 'react';
import { Location } from '../types';

interface WorldMapProps {
  locations: Record<string, Location>;
  currentLocId: string;
  onNodeClick: (locationId: string) => void;
}

const SVG_VIEWBOX_WIDTH = 800;
const SVG_VIEWBOX_HEIGHT = 600;
const NODE_RADIUS = 12;
const NODE_LABEL_OFFSET_Y = 20;

const WorldMap: React.FC<WorldMapProps> = ({ locations, currentLocId, onNodeClick }) => {
  const visitedLocations = Object.values(locations).filter(loc => loc.visited && loc.mapCoordinates);

  if (visitedLocations.length === 0) {
    return (
      <div className="p-2 border border-terminal-border rounded bg-opacity-50 bg-black h-full flex items-center justify-center">
        <p className="text-terminal-text text-sm italic">No locations explored yet.</p>
      </div>
    );
  }
  
  // Find bounds of visited locations to auto-scale/center map
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  visitedLocations.forEach(loc => {
    minX = Math.min(minX, loc.mapCoordinates.x);
    maxX = Math.max(maxX, loc.mapCoordinates.x);
    minY = Math.min(minY, loc.mapCoordinates.y);
    maxY = Math.max(maxY, loc.mapCoordinates.y);
  });

  // Add padding to bounds
  const padding = NODE_RADIUS * 5;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  const worldWidth = Math.max(1, maxX - minX);
  const worldHeight = Math.max(1, maxY - minY);
  
  const viewBox = `${minX} ${minY} ${worldWidth} ${worldHeight}`;


  return (
    <div className="p-1 border border-terminal-border rounded bg-opacity-50 bg-black h-full w-full overflow-hidden">
      <h3 className="text-xs sm:text-sm font-semibold text-terminal-accent mb-1 border-b border-terminal-border pb-0.5 px-1">World Map</h3>
      <svg 
        viewBox={viewBox} 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[calc(100%-20px)]" // Adjust height to leave space for title
      >
        <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        {/* Draw Edges/Paths first */}
        {visitedLocations.map(loc => 
          loc.exits.map(exit => {
            const targetLoc = locations[exit.locationId];
            if (targetLoc && targetLoc.visited && targetLoc.mapCoordinates) {
              // Ensure unique key for each path, considering directionality
              const pathKey = `path-${loc.id}-${targetLoc.id}`;
              return (
                <line
                  key={pathKey}
                  x1={loc.mapCoordinates.x}
                  y1={loc.mapCoordinates.y}
                  x2={targetLoc.mapCoordinates.x}
                  y2={targetLoc.mapCoordinates.y}
                  stroke="var(--color-terminal-border, #414868)"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
              );
            }
            return null;
          })
        )}

        {/* Draw Nodes and Labels */}
        {visitedLocations.map(loc => {
          const isCurrent = loc.id === currentLocId;
          const nodeColor = isCurrent ? 'var(--color-terminal-green, #9ece6a)' : 'var(--color-terminal-cyan, #7dcfff)';
          const textColor = isCurrent ? 'var(--color-terminal-green, #9ece6a)' : 'var(--color-terminal-text, #a9b1d6)';
          
          return (
            <g 
              key={loc.id} 
              className="cursor-pointer group"
              onClick={() => onNodeClick(loc.id)}
              aria-label={`Location: ${loc.name}`}
            >
              <circle
                cx={loc.mapCoordinates.x}
                cy={loc.mapCoordinates.y}
                r={NODE_RADIUS}
                fill="var(--color-terminal-bg, #1a1b26)"
                stroke={nodeColor}
                strokeWidth="2"
                className={`transition-all duration-150 group-hover:stroke-[var(--color-terminal-accent, #ff9e64)] ${isCurrent ? 'animate-pulse' : ''}`}
                filter={isCurrent ? "url(#glow)" : ""}
              />
              <text
                x={loc.mapCoordinates.x}
                y={loc.mapCoordinates.y + NODE_LABEL_OFFSET_Y + (isCurrent ? 2 : 0) } // Slightly move current label
                textAnchor="middle"
                fontSize="10px"
                fill={textColor}
                className="font-mono transition-all duration-150 group-hover:fill-[var(--color-terminal-accent, #ff9e64)]"
                style={{ pointerEvents: 'none' }}
              >
                {loc.name.length > 15 ? loc.name.substring(0,13) + '...' : loc.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default WorldMap;
