import { useEffect, useState } from "react";
import { useRef } from "react";

export default function AnimatedCounter({ value, className = "" }) {
	const [displayValue, setDisplayValue] = useState(value);
	const displayValueRef = useRef(value);

	useEffect(() => {
		let frame;
		const start = displayValueRef.current;
		const end = value;
		const delta = end - start;
		const duration = 220;
		const startTime = performance.now();
		const step = (time) => {
			const progress = Math.min((time - startTime) / duration, 1);
			setDisplayValue(Math.round(start + delta * progress));
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		displayValueRef.current = value;
		return () => cancelAnimationFrame(frame);
	}, [value]);

	return <span className={className}>{displayValue}</span>;
}