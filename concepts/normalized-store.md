Hari ini saya belajar hal baru, yaitu **Normalized Store**. _Store_ di sini merujuk pada objek penyimpanan data di sisi klien (_client-side store_).

#### Apa itu Normalized Store?

Sederhananya, Normalized Store adalah objek penyimpanan (_store_) di sisi klien yang menyerupai **relational database** di mana setiap data akan disimpan dalam **sebuah tabel** sesuai dengan tipe/bentuknya dan setiap data akan memiliki **unique ID**.

Tidak ada **_nested object_** dalam _normalized store_ sehingga setiap data akan memiliki **_reference ID_** (semacam **_foreign key_**) yang merujuk pada data di "tabel" jika diperlukan. Contohnya, data minimal yang diperlukan untuk menampilkan sebuah **Post** di dalam _Social Media Feed_ adalah **konten post (teks)** serta **nama & foto profil pengguna** yang membuat post tersebut.

Berikut adalah bentuk data `Post` yang belum dinormalisasi:

```typescript
type User {
  id: number;
  name: string;
  imageURL: string;
}

type Post {
  id: number;
  content: string;
  author: User;
}
```

Berikut adalah bentuk data `Post` yang sudah dinormalisasi:

```typescript
type User {
  id: number;
  name: string;
  imageURL: string;
}

type Post {
  id: number;
  content: string;
  authorID: number; // reference to `User.id`
}
```

#### Mengapa menggunakan Normalized Store?

1. Untuk mengurangi data yang duplikat. Contoh, bayangkan ada 100 _posts_ yang dibuat oleh **satu orang**. Jika tidak dinormalisasi, maka akan ada **100 nested objects** untuk data `author` pada 100 objek `Post` yang sebenarnya berisikan data yang sama. Sebaliknya, jika dinormalisasi, maka tidak akan ada **_100 duplicated nested objects_** untuk data `author` tersebut karena sudah disederhanakan menggunakan `authorID` untuk mereferensikan ke data pembuat post tersebut.
2. Untuk memudahkan kita saat hendak memperbarui (**_update_**) data untuk entitas/tipe yang sama (_misalnya tipe `User` untuk `author` di atas_). Masih menggunakan contoh yang sama seperti pada no 1 di atas. Jika tidak dinormalisasi, maka kita harus melakukan operasi **UPDATE sebanyak 100 kali** untuk memperbarui data pembuat post yang sama. Sebaliknya, jika dinormalisasi, maka **operasi UPDATE hanya perlu dijalankan sekali saja**, yaitu pada objek `User` itu sendiri.
