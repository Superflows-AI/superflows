export default function PaginationPageSelector(props: {
  page: number;
  clickedPrevious: () => void;
  clickedNext: () => void;
}) {
  return (
    <div className="inline-flex justify-center gap-3">
      <button className="text-gray-200" onClick={props.clickedPrevious}>
        Previous
      </button>

      <p className="text-gray-200">{props.page}</p>

      <div>
        <label htmlFor="PaginationPage" className="sr-only">
          Page
        </label>
      </div>

      <button className="text-gray-200" onClick={props.clickedNext}>
        Next
      </button>
    </div>
  );
  //
}
