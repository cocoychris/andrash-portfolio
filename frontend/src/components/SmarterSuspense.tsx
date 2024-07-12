import { ReactNode, Suspense } from "react";
import FallbackComponent from "./FallbackComponent";
import { ErrorBoundary } from "react-error-boundary";
/**
 * A drop-in replacement for React.Suspense that handles errors.
 */
export default function SmarterSuspense(props: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => {
        return (
          <FallbackComponent name={props.name} errorMessage={String(error)} />
        );
      }}
    >
      <Suspense fallback={<FallbackComponent name={props.name} />}>
        {props.children}
      </Suspense>
    </ErrorBoundary>
  );
}
