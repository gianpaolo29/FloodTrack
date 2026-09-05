<?php

/**
 * Nasugbu, Batangas — Barangay master list (42 barangays).
 *
 * Single source of truth used by WeatherController (coordinates + flood metadata)
 * and AlertController (names for targeted notifications matched against users.home_address).
 */

return [
    // === Poblacion Barangays (Brgy. 1–12) ===
    ['name' => 'Barangay 1 (Pob.)',   'latitude' => 14.0771, 'longitude' => 120.6361, 'elevation_m' => 12, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 2 (Pob.)',   'latitude' => 14.0775, 'longitude' => 120.6350, 'elevation_m' => 11, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 3 (Pob.)',   'latitude' => 14.0768, 'longitude' => 120.6340, 'elevation_m' => 10, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 4 (Pob.)',   'latitude' => 14.0763, 'longitude' => 120.6325, 'elevation_m' => 10, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 5 (Pob.)',   'latitude' => 14.0760, 'longitude' => 120.6295, 'elevation_m' =>  8, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 6 (Pob.)',   'latitude' => 14.0745, 'longitude' => 120.6310, 'elevation_m' =>  8, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Barangay 7 (Pob.)',   'latitude' => 14.0730, 'longitude' => 120.6330, 'elevation_m' =>  9, 'flood_prone' => true,  'near_river' => false, 'coastal' => false],
    ['name' => 'Barangay 8 (Pob.)',   'latitude' => 14.0715, 'longitude' => 120.6345, 'elevation_m' =>  9, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Barangay 9 (Pob.)',   'latitude' => 14.0700, 'longitude' => 120.6360, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Barangay 10 (Pob.)',  'latitude' => 14.0685, 'longitude' => 120.6375, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Barangay 11 (Pob.)',  'latitude' => 14.0670, 'longitude' => 120.6390, 'elevation_m' => 11, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Barangay 12 (Pob.)',  'latitude' => 14.0655, 'longitude' => 120.6405, 'elevation_m' => 11, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],

    // === Non-Poblacion Barangays ===
    ['name' => 'Aga',                 'latitude' => 14.0920, 'longitude' => 120.6380, 'elevation_m' => 20, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Balaytigue',          'latitude' => 14.0400, 'longitude' => 120.6180, 'elevation_m' =>  6, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Banilad',             'latitude' => 14.0980, 'longitude' => 120.6450, 'elevation_m' => 30, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Bilaran',             'latitude' => 14.0685, 'longitude' => 120.6355, 'elevation_m' => 15, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Bucana',              'latitude' => 14.0805, 'longitude' => 120.6240, 'elevation_m' =>  3, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Bulihan',             'latitude' => 14.1552, 'longitude' => 120.6540, 'elevation_m' => 19, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Bunducan',            'latitude' => 14.1069, 'longitude' => 120.6521, 'elevation_m' => 51, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Butucan',             'latitude' => 14.1394, 'longitude' => 120.6805, 'elevation_m' => 176,'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Calayo',              'latitude' => 14.0340, 'longitude' => 120.6250, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => true],
    ['name' => 'Catandaan',           'latitude' => 14.0650, 'longitude' => 120.6200, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => true],
    ['name' => 'Cogonan',             'latitude' => 14.0880, 'longitude' => 120.6500, 'elevation_m' => 40, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Dayap',               'latitude' => 14.0750, 'longitude' => 120.6550, 'elevation_m' => 45, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Kaylaway',            'latitude' => 14.0580, 'longitude' => 120.6410, 'elevation_m' => 22, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Kayrilaw',            'latitude' => 14.1027, 'longitude' => 120.7819, 'elevation_m' => 300,'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Latag',               'latitude' => 14.1000, 'longitude' => 120.6300, 'elevation_m' => 25, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Looc',                'latitude' => 14.1641, 'longitude' => 120.6295, 'elevation_m' => 13, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Lumbangan',           'latitude' => 14.0615, 'longitude' => 120.6403, 'elevation_m' => 18, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Malapad na Bato',     'latitude' => 14.0300, 'longitude' => 120.6350, 'elevation_m' =>  7, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Mataas na Pulo',      'latitude' => 14.1122, 'longitude' => 120.7452, 'elevation_m' => 261,'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Maugat',              'latitude' => 14.0868, 'longitude' => 120.6767, 'elevation_m' => 20, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Munting Indang',      'latitude' => 14.1031, 'longitude' => 120.6985, 'elevation_m' => 204,'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Natipuan',            'latitude' => 14.0460, 'longitude' => 120.6320, 'elevation_m' =>  8, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Pantalan',            'latitude' => 14.0856, 'longitude' => 120.6295, 'elevation_m' =>  5, 'flood_prone' => true,  'near_river' => true,  'coastal' => true],
    ['name' => 'Papaya',              'latitude' => 14.0520, 'longitude' => 120.6480, 'elevation_m' => 35, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Putat',               'latitude' => 14.0788, 'longitude' => 120.6527, 'elevation_m' =>  7, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Reparo',              'latitude' => 14.0830, 'longitude' => 120.6420, 'elevation_m' => 18, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Talangan',            'latitude' => 14.0777, 'longitude' => 120.6358, 'elevation_m' => 11, 'flood_prone' => true,  'near_river' => false, 'coastal' => false],
    ['name' => 'Tumalim',             'latitude' => 14.0786, 'longitude' => 120.7224, 'elevation_m' => 83, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Utod',                'latitude' => 14.1195, 'longitude' => 120.6479, 'elevation_m' => 28, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Wawa',                'latitude' => 14.0724, 'longitude' => 120.6278, 'elevation_m' =>  4, 'flood_prone' => true,  'near_river' => true,  'coastal' => true],
];
