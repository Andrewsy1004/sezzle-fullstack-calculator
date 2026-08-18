package calculator

import (
	"errors"
	"math"
)

// Operation identifies which arithmetic operation to perform.
type Operation string

// Supported operations.
const (
	OpAdd        Operation = "add"
	OpSubtract   Operation = "subtract"
	OpMultiply   Operation = "multiply"
	OpDivide     Operation = "divide"
	OpPower      Operation = "power"
	OpSqrt       Operation = "sqrt"
	OpPercentage Operation = "percentage"
)

// Sentinel errors returned by the calculator. Handlers map these to HTTP
var (
	ErrDivisionByZero       = errors.New("division by zero is not allowed")
	ErrNegativeSqrt         = errors.New("cannot compute the square root of a negative number")
	ErrUnsupportedOperation = errors.New("unsupported operation")
	ErrMissingOperand       = errors.New("operand 'b' is required for this operation")
	ErrNotFinite            = errors.New("result is not a finite number (overflow or invalid operation)")
)

// Add returns a + b.
func Add(a, b float64) float64 { return a + b }

// Subtract returns a - b.
func Subtract(a, b float64) float64 { return a - b }

// Multiply returns a * b.
func Multiply(a, b float64) float64 { return a * b }

// Divide returns a / b. It returns ErrDivisionByZero when b == 0.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

// Power returns a raised to the power of b.
func Power(a, b float64) float64 { return math.Pow(a, b) }

// Sqrt returns the square root of a. It returns ErrNegativeSqrt for a < 0.
func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(a), nil
}

// Percentage returns "a percent of b", i.e. (a / 100) * b.
func Percentage(a, b float64) float64 { return (a / 100) * b }

// Calculate dispatches to the correct operation based on op. b is a pointer
func Calculate(op Operation, a float64, b *float64) (float64, error) {
	var (
		result float64
		err    error
	)

	switch op {
	case OpAdd:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result = Add(a, *b)
	case OpSubtract:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result = Subtract(a, *b)
	case OpMultiply:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result = Multiply(a, *b)
	case OpDivide:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result, err = Divide(a, *b)
	case OpPower:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result = Power(a, *b)
	case OpSqrt:
		result, err = Sqrt(a)
	case OpPercentage:
		if b == nil {
			return 0, ErrMissingOperand
		}
		result = Percentage(a, *b)
	default:
		return 0, ErrUnsupportedOperation
	}

	if err != nil {
		return 0, err
	}

	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNotFinite
	}

	return result, nil
}
