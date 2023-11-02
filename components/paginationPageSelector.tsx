export default function PaginationPageSelector(props: {
  showPrevious: boolean;
  showNext: boolean;
  page: number;
  clickedPrevious: () => void;
  clickedNext: () => void;
}) {
  return (
    <div className="inline-flex justify-center gap-3 text-little">
      <div className="w-20 flex justify-end">
        {props.showPrevious && (
          <button
            className="text-gray-400 text-right rounded hover:bg-gray-800 py-0.5 px-1.5"
            onClick={props.clickedPrevious}
          >
            Previous
          </button>
        )}
      </div>

      <p className="text-gray-300 text-center p-0.5 text-base">{props.page}</p>

      <div className="w-20 flex justify-start">
        {props.showNext && (
          <button
            className="text-gray-400 text-left rounded hover:bg-gray-800 py-0.5 px-1.5"
            onClick={props.clickedNext}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
