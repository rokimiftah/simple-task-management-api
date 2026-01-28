class Test {
  /**
   * Menggabungkan dua array (a dan b) secara manual, lalu mengurutkan hasilnya secara ascending.
   *
   * Alur:
   * 1) Siapkan array baru `merged`.
   * 2) Salin semua elemen `a` ke `merged` dengan indexing manual.
   * 3) Lanjutkan salin semua elemen `b` ke `merged`.
   * 4) Urutkan `merged` menggunakan merge sort buatan sendiri.
   */
  mergeSortArray(a: number[], b: number[]): number[] {
    const merged: number[] = [];
    let k = 0;

    for (let i = 0; i < a.length; i++) {
      merged[k] = a[i];
      k++;
    }

    for (let j = 0; j < b.length; j++) {
      merged[k] = b[j];
      k++;
    }

    return this.mergeSort(merged);
  }

  /**
   * Mencari integer yang hilang berdasarkan "pola" dari array yang sudah terurut ascending.
   *
   * Definisi pola yang dipakai di sini:
   * - Pola dianggap memiliki step = selisih positif terkecil antar elemen berurutan.
   *
   * Alur:
   * 1) Temukan `minStep` (selisih positif terkecil).
   * 2) Untuk setiap pasangan berurutan (start, end), lakukan:
   *    - Mulai dari start + minStep
   *    - Tambahkan minStep terus sampai sebelum end
   *    - Semua nilai di antara itu adalah "missing".
   */
  getMissingData(arr: number[]): number[] {
    const n = arr.length;
    if (n <= 1) return [];

    // 1) Cari step terkecil positif
    let minStep = 0;
    for (let i = 1; i < n; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) {
        if (minStep === 0 || diff < minStep) minStep = diff;
      }
    }

    // Jika tidak ada selisih positif, tidak ada pola yang bisa dipakai
    if (minStep === 0) return [];

    // 2) Kumpulkan angka yang hilang berdasarkan minStep
    const missing: number[] = [];
    let k = 0;

    for (let i = 1; i < n; i++) {
      const start = arr[i - 1];
      const end = arr[i];

      let expected = start + minStep;
      while (expected < end) {
        missing[k] = expected;
        k++;
        expected += minStep;
      }
    }

    return missing;
  }

  /**
   * Memasukkan data yang hilang ke dalam array sumber, lalu memastikan hasil akhirnya tetap ascending.
   *
   * Alur:
   * 1) Salin isi `arr` ke `result` secara manual.
   * 2) Tambahkan semua `missingData` ke `result` secara manual.
   * 3) Urutkan `result` menggunakan merge sort agar output rapi dan konsisten ascending.
   */
  insertMissingData(arr: number[], missingData: number[]): number[] {
    const result: number[] = [];
    let k = 0;

    for (let i = 0; i < arr.length; i++) {
      result[k] = arr[i];
      k++;
    }

    for (let j = 0; j < missingData.length; j++) {
      result[k] = missingData[j];
      k++;
    }

    return this.mergeSort(result);
  }

  /**
   * Menjalankan rangkaian proses:
   * 1) Merge + Sort => c
   * 2) Cari missing => i
   * 3) Insert missing + Sort => d
   * 4) Cetak hasil agar mudah diverifikasi.
   */
  main(): void {
    const a: number[] = [11, 36, 65, 135, 98];
    const b: number[] = [];
    b[0] = 81;
    b[1] = 23;
    b[2] = 50;
    b[3] = 155;

    const c = this.mergeSortArray(a, b);
    const i = this.getMissingData(c);
    const d = this.insertMissingData(c, i);

    this.print("Sorted merge (c)", c);
    this.print("Missing (i)", i);
    this.print("Final (d)", d);
  }

  /**
   * Merge Sort (divide & conquer).
   *
   * Alur:
   * 1) Base case: jika panjang <= 1, sudah terurut.
   * 2) Split array menjadi left dan right (manual).
   * 3) Recursively sort left dan right.
   * 4) Merge dua array yang sudah terurut menjadi satu array terurut.
   */
  private mergeSort(arr: number[]): number[] {
    const n = arr.length;
    if (n <= 1) return arr;

    const mid = Math.floor(n / 2);

    const left: number[] = [];
    const right: number[] = [];

    for (let i = 0; i < mid; i++) left[i] = arr[i];
    for (let i = mid; i < n; i++) right[i - mid] = arr[i];

    const sortedLeft = this.mergeSort(left);
    const sortedRight = this.mergeSort(right);

    return this.mergeTwoSorted(sortedLeft, sortedRight);
  }

  /**
   * Menggabungkan dua array yang sudah terurut ascending menjadi satu array terurut.
   *
   * Alur:
   * 1) Pakai dua pointer (i untuk left, j untuk right).
   * 2) Bandingkan left[i] dan right[j], ambil yang lebih kecil dulu.
   * 3) Jika salah satu habis, tuangkan sisa yang lain.
   */
  private mergeTwoSorted(left: number[], right: number[]): number[] {
    const result: number[] = [];
    let i = 0;
    let j = 0;
    let k = 0;

    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result[k] = left[i];
        i++;
      } else {
        result[k] = right[j];
        j++;
      }
      k++;
    }

    while (i < left.length) {
      result[k] = left[i];
      i++;
      k++;
    }

    while (j < right.length) {
      result[k] = right[j];
      j++;
      k++;
    }

    return result;
  }

  /**
   * Mencetak array tanpa memakai `join()`.
   *
   * Alur:
   * 1) Bangun string mulai dari "[".
   * 2) Tambahkan setiap elemen satu per satu.
   * 3) Sisipkan ", " di antara elemen.
   * 4) Tutup dengan "]".
   */
  private print(label: string, arr: number[]): void {
    let s = "[";
    for (let i = 0; i < arr.length; i++) {
      s += String(arr[i]);
      if (i < arr.length - 1) s += ", ";
    }
    s += "]";
    console.log(`${label}: ${s}`);
  }
}

const t = new Test();
t.main();
