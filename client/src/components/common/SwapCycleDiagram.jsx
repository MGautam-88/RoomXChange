export default function SwapCycleDiagram({ compact = false }) {
	const nodes = [
		{ id: "1", label: "C101", x: 200, y: 65 },
		{ id: "2", label: "D204", x: 310, y: 145 },
		{ id: "3", label: "A309", x: 268, y: 265 },
		{ id: "4", label: "F412", x: 132, y: 265 },
		{ id: "5", label: "E312", x: 90, y: 145 },
	];

	const edges = [
		{ path: "M 220,72 Q 270,95 292,130" },
		{ path: "M 302,162 Q 295,215 264,248" },
		{ path: "M 246,265 Q 200,282 154,265" },
		{ path: "M 136,248 Q 105,215 98,162" },
		{ path: "M 108,130 Q 130,95 180,72" },
		{ path: "M 200,89 Q 228,170 258,245", dash: true },
	];

	return (
		<div className={`swap-graph-container ${compact ? "swap-graph-compact" : ""}`.trim()} aria-hidden="true">
			<svg className="swap-graph-svg" viewBox="0 0 400 330" fill="none">
				<defs>
					<linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#c9f31d" stopOpacity="0.9" />
						<stop offset="100%" stopColor="#5fd068" stopOpacity="0.8" />
					</linearGradient>

					<linearGradient id="edgeDashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#5fd068" stopOpacity="0.5" />
						<stop offset="100%" stopColor="#c9f31d" stopOpacity="0.5" />
					</linearGradient>

					<filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feComposite in="SourceGraphic" in2="blur" operator="over" />
					</filter>

					<marker
						id="graphArrowHead"
						viewBox="0 0 10 10"
						refX="6"
						refY="5"
						markerWidth="6"
						markerHeight="6"
						orient="auto-start-reverse"
					>
						<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c9f31d" />
					</marker>

					<marker
						id="graphArrowHeadDash"
						viewBox="0 0 10 10"
						refX="6"
						refY="5"
						markerWidth="5"
						markerHeight="5"
						orient="auto-start-reverse"
					>
						<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#5fd068" opacity="0.7" />
					</marker>
				</defs>

				{/* Directed Edge Paths */}
				{edges.map((edge, index) => (
					<path
						key={`edge-${index}`}
						d={edge.path}
						stroke={edge.dash ? "url(#edgeDashGrad)" : "url(#edgeGrad)"}
						strokeWidth={edge.dash ? "2" : "2.5"}
						strokeDasharray={edge.dash ? "6 5" : "none"}
						markerEnd={edge.dash ? "url(#graphArrowHeadDash)" : "url(#graphArrowHead)"}
						className={edge.dash ? "graph-edge-dash" : "graph-edge-flow"}
					/>
				))}

				{/* 5 Clean Directed Nodes */}
				{nodes.map((node) => (
					<g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="graph-node-group">
						<circle className="graph-node-glow" r="24" fill="#0b0e0c" stroke="#c9f31d" strokeWidth="2" filter="url(#nodeGlow)" />
						<circle className="graph-node-inner" r="20" fill="#131815" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
						
						{/* Room Label */}
						<text
							y="4"
							textAnchor="middle"
							fill="#ffffff"
							fontSize="11"
							fontWeight="700"
							fontFamily="var(--font-mono)"
							letterSpacing="0.05em"
						>
							{node.label}
						</text>
					</g>
				))}
			</svg>
		</div>
	);
}