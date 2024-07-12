import { useEffect, useState } from "react";
import "./FallbackComponent.css";
const DEFAULT_TIMEOUT = 5000;
export default function FallbackComponent(props: {
  name: string;
  timeoutMs?: number;
  errorMessage?: string;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (props.errorMessage) {
      setErrorMessage(props.errorMessage);
      return;
    }
    const timeoutMs = props.timeoutMs || DEFAULT_TIMEOUT;
    const timer = setTimeout(() => {
      setErrorMessage(
        `Timed out after ${timeoutMs}ms. Try to reload the page or check your network connection.`
      );
    }, timeoutMs);
    return () => {
      clearTimeout(timer);
    };
  }, [props.timeoutMs]);

  return errorMessage ? (
    <div className="suspense-fallback suspense-fallback-error">
      <p>
        <strong>Failed to load {props.name}.</strong>
        <br />
        {errorMessage}
      </p>
    </div>
  ) : (
    <div className="suspense-fallback">
      <p>
        <strong>Loading {props.name}...</strong>
      </p>
    </div>
  );
}
