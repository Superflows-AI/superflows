export default function PaginationPageSelector(props: {
  showPrevious: boolean;
  showNext: boolean;
  page: number;
  clickedPrevious: () => void;
  clickedNext: () => void;
}) {
  return (
    <div className="inline-flex justify-center gap-3">
      {props.showPrevious ? (
        <button
          className="text-gray-200 w-20 text-right"
          onClick={props.clickedPrevious}
        >
          Previous
        </button>
      ) : (
        <div className="w-20"></div>
      )}

      <p className="text-gray-200 text-center">{props.page}</p>

      {props.showNext ? (
        <button
          className="text-gray-200 w-20 text-left"
          onClick={props.clickedNext}
        >
          Next
        </button>
      ) : (
        <div className="w-20"></div>
      )}
    </div>
  );
}
