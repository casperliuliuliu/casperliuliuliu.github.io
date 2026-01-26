import numpy as np
import os

def convert_matrix():
    # Paths
    input_path = os.path.join(os.path.dirname(__file__), '../assets/learned_matrix.npy')
    output_dir = os.path.join(os.path.dirname(__file__), '../static/matrix')
    output_path = os.path.join(output_dir, 'matrix_data.bin')

    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"Loading matrix from {input_path}...")
    try:
        matrix = np.load(input_path)
    except FileNotFoundError:
        print(f"Error: File not found at {input_path}")
        return

    print(f"Matrix shape: {matrix.shape}")
    
    # Ensure it's 3x512x512
    if matrix.shape != (3, 512, 512):
        print("Warning: Matrix shape is expected to be (3, 512, 512).")

    # Flatten the matrix (C-order: channel, row, col)
    # The JS side will read this flat buffer.
    # We should ensure it is float32
    matrix_float32 = matrix.astype(np.float32)
    
    # Save to binary
    print(f"Saving binary to {output_path}...")
    matrix_float32.tofile(output_path)
    print("Done.")

if __name__ == '__main__':
    convert_matrix()
