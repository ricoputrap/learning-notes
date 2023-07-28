# Offset-based Pagination

Sebuah pendekatan dalam melakukan paginasi dengan **membagi data** berdasarkan **nomor halaman** (`page`) dan **jumlah data** (`size`) yang hendak ditampilkan dalam halaman tersebut.

##### Parameter:

- `size`: number (jumlah data item yang dikembalikan per halaman)
- `page`: number (nomor halaman dari data yang akan diminta)

Misalnya, ada 50 buah post dalam aplikasi _social media feed_ yang Anda miliki (misal: Twitter). Dengan menggunakan parameter `{ size: 10, page: 2 }`, data yang akan dikembalikan oleh API adalah sebagai berikut:

```json
{
  "pagination": {
    "size": 10,
    "page": 2,
    "total_pages": 5,
    "total": 50
  },
  "results": [
    {
      "id": 0,
      "content": "Selamat data di X!",
      "author": {
        "id": 0,
        "name": "Rico",
        "image_url": "https://media.licdn.com/dms/image/D5603AQEWszVZSTg9_g/profile-displayphoto-shrink_400_400/0/1670101852464?e=1695859200&v=beta&t=UtPmFNoxpi3U8wWdwcNy5XH_5gIWl6EJjubJCSvSPN0"
      },
      "created_time": 1690527636
    }
    // ... More posts.
  ]
}
```

##### Contoh SQL Query

```sql
SELECT * FROM posts LIMIT 10 OFFSET 0; -- Halaman pertama
SELECT * FROM posts LIMIT 10 OFFSET 10; -- Halaman kedua
```

##### Kelebihan Offset-based Pagination

1. User dapat dengan mudah berpindah ke halaman tertentu (dengan menggunakan parameter `page`).
2. Mudah untuk mendapatkan jumlah total halaman yang tersedia.
3. Mudah untuk diimplementasi di backend dengan menggunakan query SQL sederhana seperti di atas.

##### Kekurangan Offset-based Pagination

1. **Data tidak konsisten**
   Pada aplikasi yang dapat mengalami **perubahan yang cukup sering** seperti sistem **_ticketing_**, dalam beberapa menit bahkan detik mungkin terbuat satu atau beberapa tiket baru. Misalnya saat ini Anda mengirim API call untuk mendapatkan **10 tiket** pada pada **halaman kedua**, lalu dalam 1 menit kemudian terdapat **5 tiket baru**. Pada saat itu, Anda hendak membuka **halaman ketiga**, maka **5 tiket terakhir** yg sebelumnya berada di halaman ke-2 **akan muncul kembali pada halaman ketiga**.

2. **Performa Menurun**
   Semakin banyak datanya, maka **semakin banyak pula data yang akan di-_skip_ oleh database** saat mencoba mengambil data pada halaman-halaman akhir (_nilai `offset` besar_) yang pada akhirnya berpotensi menyebabkan penurunan performa proses paginasi tersebut.

##### Kapan sebaiknya menggunakan Offset-based Pagination

1. Ketika ukuran datanya cukup kecil (_meminimalisir proses **skipping records** dalam basis data_).
2. Ketika data yang akan ditampilkan **tidak cukup sering berubah** (_terhindar dari masalah **data tidak konsisten**_).

##### Contoh Kasus

1. Blogging Platform
2. Todo List
3. Photo Gallery
4. E-commerce Product Listings

#### Source

[GreatFrontEnd: News Feed (e.g. Facebook)](https://www.greatfrontend.com/questions/system-design/news-feed-facebook)
