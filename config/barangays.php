<?php

/**
 * Nasugbu, Batangas — Barangay master list.
 *
 * Single source of truth used by WeatherController (coordinates + flood metadata)
 * and AlertController (names for targeted notifications matched against users.home_address).
 */

return [
    ['name' => 'Poblacion (Brgy. I-IV)',  'latitude' => 14.0771, 'longitude' => 120.6361, 'elevation_m' => 12, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Pantalan',                'latitude' => 14.0856, 'longitude' => 120.6295, 'elevation_m' =>  5, 'flood_prone' => true,  'near_river' => true,  'coastal' => true],
    ['name' => 'Bilaran',                 'latitude' => 14.0685, 'longitude' => 120.6355, 'elevation_m' => 15, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Lumbangan',               'latitude' => 14.0615, 'longitude' => 120.6403, 'elevation_m' => 18, 'flood_prone' => true,  'near_river' => true,  'coastal' => false],
    ['name' => 'Wawa',                    'latitude' => 14.0724, 'longitude' => 120.6278, 'elevation_m' =>  4, 'flood_prone' => true,  'near_river' => true,  'coastal' => true],
    ['name' => 'Bucana',                  'latitude' => 14.0805, 'longitude' => 120.6240, 'elevation_m' =>  3, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Kaylaway',                'latitude' => 14.0580, 'longitude' => 120.6410, 'elevation_m' => 22, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Natipuan',                'latitude' => 14.0460, 'longitude' => 120.6320, 'elevation_m' =>  8, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Calayo',                  'latitude' => 14.0340, 'longitude' => 120.6250, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => true],
    ['name' => 'Papaya',                  'latitude' => 14.0520, 'longitude' => 120.6480, 'elevation_m' => 35, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Aga',                     'latitude' => 14.0920, 'longitude' => 120.6380, 'elevation_m' => 20, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Banilad',                 'latitude' => 14.0980, 'longitude' => 120.6450, 'elevation_m' => 30, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Balaytigue',              'latitude' => 14.0400, 'longitude' => 120.6180, 'elevation_m' =>  6, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Catandaan',               'latitude' => 14.0650, 'longitude' => 120.6200, 'elevation_m' => 10, 'flood_prone' => false, 'near_river' => false, 'coastal' => true],
    ['name' => 'Cogonan',                 'latitude' => 14.0880, 'longitude' => 120.6500, 'elevation_m' => 40, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Dayap',                   'latitude' => 14.0750, 'longitude' => 120.6550, 'elevation_m' => 45, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Latag',                   'latitude' => 14.1000, 'longitude' => 120.6300, 'elevation_m' => 25, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
    ['name' => 'Lian (boundary)',          'latitude' => 14.1050, 'longitude' => 120.6520, 'elevation_m' => 50, 'flood_prone' => false, 'near_river' => false, 'coastal' => false],
    ['name' => 'Malapad na Bato',         'latitude' => 14.0300, 'longitude' => 120.6350, 'elevation_m' =>  7, 'flood_prone' => true,  'near_river' => false, 'coastal' => true],
    ['name' => 'Reparo',                  'latitude' => 14.0830, 'longitude' => 120.6420, 'elevation_m' => 18, 'flood_prone' => false, 'near_river' => true,  'coastal' => false],
];
