import { Spinner } from "@appica/ui-react/spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner aria-label="Loading" />
    </div>
  );
}
