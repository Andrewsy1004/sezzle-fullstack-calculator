import type { FormEvent } from "react";
import { useCalculator } from "../../hooks";
import { OPERATIONS, type Operation } from "../../types";
import "./Calculator.css";

/**
  Renders the calculator UI: operation select, operand inputs (operand B
 hides itself for unary operations like sqrt), and the result/error panel.
 All state and API interaction live in useCalculator — this component is
 * purely presentational glue.
 */
export function Calculator() {
  const {
    operandA,
    operandB,
    operation,
    result,
    error,
    isLoading,
    isUnary,
    setOperandA,
    setOperandB,
    setOperation,
    submit,
    reset,
  } = useCalculator();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <div className="calculator">
      <h1 className="calculator__title">Calculator</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="calculator__field">
          <label className="calculator__label" htmlFor="operation">
            Operation
          </label>
          <select
            id="operation"
            className="calculator__select"
            value={operation}
            onChange={(e) => setOperation(e.target.value as Operation)}
          >
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label} ({op.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="calculator__row">
          <div className="calculator__field">
            <label className="calculator__label" htmlFor="operandA">
              {isUnary ? "Value" : "Value A"}
            </label>
            <input
              id="operandA"
              className="calculator__input"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 10"
              value={operandA}
              onChange={(e) => setOperandA(e.target.value)}
            />
          </div>

          {!isUnary && (
            <div className="calculator__field">
              <label className="calculator__label" htmlFor="operandB">
                Value B
              </label>
              <input
                id="operandB"
                className="calculator__input"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 2"
                value={operandB}
                onChange={(e) => setOperandB(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="calculator__actions">
          <button type="submit" className="calculator__button calculator__button--primary" disabled={isLoading}>
            {isLoading ? "Calculating…" : "Calculate"}
          </button>
          <button
            type="button"
            className="calculator__button calculator__button--secondary"
            onClick={reset}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>
      </form>

      {result !== null && (
        <div className="calculator__result" role="status">
          Result: <strong>{result}</strong>
        </div>
      )}

      {error !== null && (
        <div className="calculator__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
