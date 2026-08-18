package calculator

import (
	"errors"
	"math"
	"testing"
)

func f(v float64) *float64 { return &v }

func TestAdd(t *testing.T) {
	if got := Add(2, 3); got != 5 {
		t.Errorf("Add(2,3) = %v, want 5", got)
	}
	if got := Add(-2, -3); got != -5 {
		t.Errorf("Add(-2,-3) = %v, want -5", got)
	}
}

func TestSubtract(t *testing.T) {
	if got := Subtract(5, 3); got != 2 {
		t.Errorf("Subtract(5,3) = %v, want 2", got)
	}
}

func TestMultiply(t *testing.T) {
	if got := Multiply(4, 3); got != 12 {
		t.Errorf("Multiply(4,3) = %v, want 12", got)
	}
	if got := Multiply(-4, 3); got != -12 {
		t.Errorf("Multiply(-4,3) = %v, want -12", got)
	}
}

func TestDivide(t *testing.T) {
	got, err := Divide(10, 2)
	if err != nil {
		t.Fatalf("Divide(10,2) unexpected error: %v", err)
	}
	if got != 5 {
		t.Errorf("Divide(10,2) = %v, want 5", got)
	}

	_, err = Divide(10, 0)
	if !errors.Is(err, ErrDivisionByZero) {
		t.Errorf("Divide(10,0) error = %v, want ErrDivisionByZero", err)
	}
}

func TestPower(t *testing.T) {
	if got := Power(2, 10); got != 1024 {
		t.Errorf("Power(2,10) = %v, want 1024", got)
	}
	if got := Power(9, 0.5); got != 3 {
		t.Errorf("Power(9,0.5) = %v, want 3", got)
	}
}

func TestSqrt(t *testing.T) {
	got, err := Sqrt(16)
	if err != nil {
		t.Fatalf("Sqrt(16) unexpected error: %v", err)
	}
	if got != 4 {
		t.Errorf("Sqrt(16) = %v, want 4", got)
	}

	_, err = Sqrt(-4)
	if !errors.Is(err, ErrNegativeSqrt) {
		t.Errorf("Sqrt(-4) error = %v, want ErrNegativeSqrt", err)
	}
}

func TestPercentage(t *testing.T) {
	// 20% of 50 = 10
	if got := Percentage(20, 50); got != 10 {
		t.Errorf("Percentage(20,50) = %v, want 10", got)
	}
}

func TestCalculate_TableDriven(t *testing.T) {
	tests := []struct {
		name    string
		op      Operation
		a       float64
		b       *float64
		want    float64
		wantErr error
	}{
		{"add", OpAdd, 2, f(3), 5, nil},
		{"subtract", OpSubtract, 5, f(2), 3, nil},
		{"multiply", OpMultiply, 4, f(5), 20, nil},
		{"divide", OpDivide, 10, f(2), 5, nil},
		{"divide by zero", OpDivide, 10, f(0), 0, ErrDivisionByZero},
		{"power", OpPower, 2, f(3), 8, nil},
		{"sqrt", OpSqrt, 9, nil, 3, nil},
		{"sqrt negative", OpSqrt, -9, nil, 0, ErrNegativeSqrt},
		{"percentage", OpPercentage, 50, f(200), 100, nil},
		{"missing operand add", OpAdd, 2, nil, 0, ErrMissingOperand},
		{"missing operand divide", OpDivide, 2, nil, 0, ErrMissingOperand},
		{"unsupported op", Operation("modulo"), 2, f(3), 0, ErrUnsupportedOperation},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.a, tt.b)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Calculate(%s) error = %v, want %v", tt.name, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Calculate(%s) unexpected error: %v", tt.name, err)
			}
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("Calculate(%s) = %v, want %v", tt.name, got, tt.want)
			}
		})
	}
}

func TestCalculate_OverflowProducesError(t *testing.T) {
	huge := math.MaxFloat64
	_, err := Calculate(OpMultiply, huge, f(huge))
	if !errors.Is(err, ErrNotFinite) {
		t.Errorf("expected ErrNotFinite on overflow, got %v", err)
	}
}
