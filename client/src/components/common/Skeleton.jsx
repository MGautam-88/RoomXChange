export default function Skeleton({ className = "", lines = 1 }) {
	return <div className={`skeleton ${className}`.trim()}>{Array.from({ length: lines }).map((_, index) => <span key={index} className="skeleton-line" />)}</div>;
}