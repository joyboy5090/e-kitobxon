// Replit qo'shgan 6 ta namunaviy kitob olib tashlandi.
// Kutubxona endi faqat admin panel orqali yuklangan kitoblardan iborat.
// Janrlar ro'yxati ham yuklangan kitoblarning janridan avtomatik olinadi (main.jsx).
export const books = []
export const genres = []

export const getBook = (id) => books.find((book) => book.id === id)
