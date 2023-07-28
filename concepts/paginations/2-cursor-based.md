# Cursor-based Pagination

Sebuah pendekatan lain dalam melakukan paginasi dengan mengembalikan sejumlah data (_berdasarkan nilai parameter `size`_) serta sebuah **_pointer_** (**_cursor_**) yang mengacu pada **data terakhir** yang dikembalikan. Jika `size = 10`, maka _cursor_ tersebut mengacu pada data ke-10. **_Cursor_** yang dimaksud dapat berupa **_timestamp_**, **_unique ID_**, atau field tertentu dalam sebuah tabel (**_primary key_**).

##### Parameter

- `size`: number (jumlah data item yang dikembalikan)
- `cursor`: string (sebuah **_identifier_** yang mengacu pada data item terakhir)

#####

```json
{
  "pagination": {
    "size": 10,
    "next_cursor": "=dXNlcjpVMEc5V0ZYTlo"
  },
  "results": [
    {
      "id": "123",
      "author": {
        "id": "0",
        "name": "Rico"
      },
      "content": "Menggunakan cursor-based pagination",
      "image": "https://media.licdn.com/dms/image/D5603AQEWszVZSTg9_g/profile-displayphoto-shrink_400_400/0/1670101852464?e=1695859200&v=beta&t=UtPmFNoxpi3U8wWdwcNy5XH_5gIWl6EJjubJCSvSPN0",
      "created_time": 1690555169
    }
    // ... More posts.
  ]
}
```

##### Kelebihan Cursor-based Pagination

Masalah ketidak-akuratan data seperti yang dijelaskan pada bagian artikel **Offset-based Pagination** dapat dihindari karena `cursor` akan tetap selalu mengacu pada **item terakhir** dari data yang dikembalikan pada permintaan terakhir.

##### Kekurangan Cursor-based Pagination

Pendekatan ini tidak memungkinkan kita untuk _"loncat"_ atau berpindah ke halaman tertentu.

##### Kapan sebaiknya menggunakan Cursor-based Pagination

1. Ketika **data** yang akan ditampilkan **cukup sering berubah** (bertambah/berkurang).
2. Ketika data **tidak ditampilkan** dalam beberapa **halaman bernomor** yang memungkinkan pengguna untuk **membuka halaman tertentu**.
3. Ketika **data** dapat **berubah secara _realtime_**

##### Contoh kasus

1. Social Media Feeds
2. Chat Applications
3. Activity Log (sistem yang mencatat aktifitas pengguna dalam aplikasi)

#### Source

[GreatFrontEnd: News Feed (e.g. Facebook)](https://www.greatfrontend.com/questions/system-design/news-feed-facebook)
