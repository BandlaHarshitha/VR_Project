#include <GL/glut.h>
#include <cmath>

// Global quadric object for drawing cylinders/cones/disks
GLUquadric* quad;

// Frog position and movement variables
float frogY = 0.01f;
float frogVelocity = 0.12f;
float gravity = -0.008f;

// Frog's initial position
float frogX = -40.0f;
float frogZ = 20.0f;

float moveStep = 1.0f;      // How much frog moves per jump
int direction = 1;          // 1: towards pond, -1: away
bool hasReachedPond = false; // Track if frog reached pond

// Jump animation variables
float jumpDuration = 60.0f; // Frames per jump
float jumpProgress = 0.0f;  // Current jump progress

bool isJumping = true;      // Frog jumping state

// Shooting star structure
struct ShootingStar {
    float x, y, z;      // Position
    float dx, dy, dz;   // Movement direction
    bool active;        // Is star visible
    int life;           // Frames remaining
};

ShootingStar star = { 0, 0, 0, 0, 0, 0, false, 0 };

// OpenGL initialization: lighting, quadric, etc.
void init() {
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f); // Background color
    glEnable(GL_DEPTH_TEST);               // Enable depth
    glEnable(GL_LIGHTING);                 // Enable lighting
    glEnable(GL_COLOR_MATERIAL);           // Enable color material
    glColorMaterial(GL_FRONT, GL_AMBIENT_AND_DIFFUSE);
    glShadeModel(GL_SMOOTH);

    // Moon light setup
    GLfloat moonLightAmbient[] = { 0.2f, 0.2f, 0.2f, 1.0f };
    GLfloat moonLightDiffuse[] = { 0.6f, 0.6f, 0.5f, 1.0f };
    GLfloat moonLightSpecular[] = { 0.3f, 0.3f, 0.3f, 1.0f };
    GLfloat moonLightPosition[] = { -30.0f, 50.0f, -50.0f, 1.0f };

    glEnable(GL_LIGHT0);
    glLightfv(GL_LIGHT0, GL_AMBIENT, moonLightAmbient);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, moonLightDiffuse);
    glLightfv(GL_LIGHT0, GL_SPECULAR, moonLightSpecular);
    glLightfv(GL_LIGHT0, GL_POSITION, moonLightPosition);

    // Lamp post light setup
    GLfloat lampAmbient[] = { 0.1f, 0.1f, 0.0f, 1.0f };
    GLfloat lampDiffuse[] = { 1.0f, 1.0f, 0.6f, 1.0f };
    GLfloat lampSpecular[] = { 1.0f, 1.0f, 0.6f, 1.0f };
    GLfloat lampPosition[] = { 2.0f, 13.2f, 20.0f, 1.0f };

    glEnable(GL_LIGHT1);
    glLightfv(GL_LIGHT1, GL_AMBIENT, lampAmbient);
    glLightfv(GL_LIGHT1, GL_DIFFUSE, lampDiffuse);
    glLightfv(GL_LIGHT1, GL_SPECULAR, lampSpecular);
    glLightfv(GL_LIGHT1, GL_POSITION, lampPosition);

    quad = gluNewQuadric(); // Create quadric object
}

// Draw ground as a large green quad
void drawGround() {
    glColor3f(0.0f, 0.6f, 0.0f);
    glBegin(GL_QUADS);
    glVertex3f(-100.0f, 0.0f, -100.0f);
    glVertex3f(100.0f, 0.0f, -100.0f);
    glVertex3f(100.0f, 0.0f, 100.0f);
    glVertex3f(-100.0f, 0.0f, 100.0f);
    glEnd();
}

// Draw pond as a blue disk
void drawPond() {
    glColor3f(0.0f, 0.3f, 0.8f);
    GLfloat waterAmbient[] = { 0.0f, 0.1f, 0.3f, 1.0f };
    GLfloat waterDiffuse[] = { 0.0f, 0.3f, 0.8f, 1.0f };
    GLfloat waterSpecular[] = { 0.4f, 0.4f, 0.5f, 1.0f };
    GLfloat waterShininess = 20.0f;

    glMaterialfv(GL_FRONT, GL_AMBIENT, waterAmbient);
    glMaterialfv(GL_FRONT, GL_DIFFUSE, waterDiffuse);
    glMaterialfv(GL_FRONT, GL_SPECULAR, waterSpecular);
    glMaterialf(GL_FRONT, GL_SHININESS, waterShininess);

    const float radius = 15.0f;
    const float centerX = 20.0f;
    const float centerZ = 20.0f;
    const float y = 0.01f;

    glBegin(GL_TRIANGLE_FAN);
    glVertex3f(centerX, y, centerZ); // Center of pond
    for (int i = 0; i <= 100; ++i) {
        float angle = 2.0f * 3.1415926f * i / 100;
        float x = centerX + radius * cosf(angle);
        float z = centerZ + radius * sinf(angle);
        glVertex3f(x, y, z);
    }
    glEnd();
}

// Draw a single stone as a cube
void drawStoneCube(float x, float y, float z, float size) {
    float half = size / 2.0f;
    glColor3f(0.5f, 0.5f, 0.5f); // Gray color

    glBegin(GL_QUADS);
    // Bottom face
    glVertex3f(x - half, y, z - half);
    glVertex3f(x + half, y, z - half);
    glVertex3f(x + half, y, z + half);
    glVertex3f(x - half, y, z + half);

    // Top face
    glVertex3f(x - half, y + size, z - half);
    glVertex3f(x + half, y + size, z - half);
    glVertex3f(x + half, y + size, z + half);
    glVertex3f(x - half, y + size, z + half);

    // Front face
    glVertex3f(x - half, y, z + half);
    glVertex3f(x + half, y, z + half);
    glVertex3f(x + half, y + size, z + half);
    glVertex3f(x - half, y + size, z + half);

    // Back face
    glVertex3f(x - half, y, z - half);
    glVertex3f(x + half, y, z - half);
    glVertex3f(x + half, y + size, z - half);
    glVertex3f(x - half, y + size, z - half);

    // Left face
    glVertex3f(x - half, y, z - half);
    glVertex3f(x - half, y, z + half);
    glVertex3f(x - half, y + size, z + half);
    glVertex3f(x - half, y + size, z - half);

    // Right face
    glVertex3f(x + half, y, z - half);
    glVertex3f(x + half, y, z + half);
    glVertex3f(x + half, y + size, z + half);
    glVertex3f(x + half, y + size, z - half);
    glEnd();
}

// Draw stones around the pond
void drawStones() {
    const float radius = 15.0f;
    const float centerX = 20.0f;
    const float centerZ = 20.0f;
    const float y = 0.01f;
    const float stoneSize = 2.0f;
    const int numStones = 30;

    for (int i = 0; i < numStones; ++i) {
        float angle = 2.0f * 3.1415926f * i / numStones;
        float x = centerX + radius * cosf(angle);
        float z = centerZ + radius * sinf(angle);
        drawStoneCube(x, y, z, stoneSize);
    }
}

// Draw lotus bud with stem and disk
void drawLotusBud() {
    const float stemHeight = 6.0f;
    const float stemRadius = 0.2f;
    const float budHeight = 3.0f;
    const float budBaseRadius = 1.0f;

    float stemX = 20.0f - 8.0f;
    float stemZ = 20.0f;
    float stemY = 0.01f;

    // Draw disk at base
    glColor3f(0.0f, 0.5f, 0.0f);
    glPushMatrix();
    glTranslatef(stemX, stemY + 0.01f, stemZ);
    glRotatef(-90, 1, 0, 0);
    gluDisk(quad, 0.0f, 3.0f, 30, 1);
    glPopMatrix();

    // Draw stem
    glColor3f(0.0f, 0.6f, 0.0f);
    glPushMatrix();
    glTranslatef(stemX, stemY, stemZ);
    glRotatef(-90, 1, 0, 0);
    gluCylinder(quad, stemRadius, stemRadius, stemHeight, 20, 4);
    glPopMatrix();

    // Draw bud
    glColor3f(1.0f, 0.4f, 0.7f);
    glPushMatrix();
    glTranslatef(stemX, stemY + stemHeight, stemZ);
    glRotatef(-90, 1, 0, 0);
    glutSolidCone(budBaseRadius, budHeight, 20, 20);
    glPopMatrix();
}

// Draw frog at given position
void drawFrog(float baseX, float baseY, float baseZ) {
    // Body - green sphere
    glColor3f(0.1f, 0.3f, 0.1f);
    glPushMatrix();
    glTranslatef(baseX, baseY + 1.0f, baseZ);
    glutSolidSphere(1.2, 30, 30);
    glPopMatrix();

    // Head - smaller green sphere in front
    glColor3f(0.1f, 0.5f, 0.4f);
    glPushMatrix();
    glTranslatef(baseX, baseY + 1.8f, baseZ + 0.9f);
    glutSolidSphere(0.8, 30, 30);
    glPopMatrix();

    // Eyes - white spheres on top of head
    glColor3f(1.0f, 1.0f, 1.0f);
    // Left eye
    glPushMatrix();
    glTranslatef(baseX - 0.35f, baseY + 2.3f, baseZ + 0.75f);
    glutSolidSphere(0.25, 20, 20);
    glPopMatrix();

    // Right eye
    glPushMatrix();
    glTranslatef(baseX + 0.35f, baseY + 2.3f, baseZ + 0.75f);
    glutSolidSphere(0.25, 20, 20);
    glPopMatrix();

    // Pupils - black spheres inside eyes
    glColor3f(0.0f, 0.0f, 0.0f);
    // Left pupil
    glPushMatrix();
    glTranslatef(baseX - 0.35f, baseY + 2.35f, baseZ + 0.9f);
    glutSolidSphere(0.1, 20, 20);
    glPopMatrix();

    // Right pupil
    glPushMatrix();
    glTranslatef(baseX + 0.35f, baseY + 2.35f, baseZ + 0.9f);
    glutSolidSphere(0.1, 20, 20);
    glPopMatrix();

    // Legs - 4 small green spheres near the body base
    glColor3f(0.1f, 0.5f, 0.1f);
    float legY = baseY + 0.5f;

    // Front-left leg
    glPushMatrix();
    glTranslatef(baseX - 0.7f, legY, baseZ + 0.4f);
    glutSolidSphere(0.3, 20, 20);
    glPopMatrix();

    // Front-right leg
    glPushMatrix();
    glTranslatef(baseX + 0.7f, legY, baseZ + 0.4f);
    glutSolidSphere(0.3, 20, 20);
    glPopMatrix();

    // Back-left leg
    glPushMatrix();
    glTranslatef(baseX - 0.7f, legY, baseZ - 0.5f);
    glutSolidSphere(0.3, 20, 20);
    glPopMatrix();

    // Back-right leg
    glPushMatrix();
    glTranslatef(baseX + 0.7f, legY, baseZ - 0.5f);
    glutSolidSphere(0.3, 20, 20);
    glPopMatrix();
}

// Update frog and shooting star animation
void update(int value) {
    if (isJumping) {
        jumpProgress += 1.0f;

        // Vertical hop arc (parabolic)
        float t = jumpProgress / jumpDuration;
        frogY = 4.0f * t * (1 - t);

        // Move frog horizontally at start of jump
        if (jumpProgress == 1.0f) {
            frogX += direction * moveStep;

            // Change direction if frog reaches pond area
            if (!hasReachedPond && frogX >= 5.0f) {
                direction = -1;           // Start going back
                hasReachedPond = true;
            }

            // Reset if frog exits scene
            if (hasReachedPond && frogX <= -40.0f) {
                direction = 1;            // Start entering again
                hasReachedPond = false;
            }
        }

        // Reset jump when done
        if (jumpProgress >= jumpDuration) {
            jumpProgress = 0.0f;
        }

        // Update shooting star position
        if (star.active) {
            star.x += star.dx;
            star.y += star.dy;
            star.z += star.dz;
            star.life--;

            if (star.life <= 0 || star.y < 0.0f) {
                star.active = false;
            }
        }
    }

    glutPostRedisplay();           // Request redraw
    glutTimerFunc(16, update, 0);  // Call update again after 16ms (~60fps)
}

// Draw a tree at given position
void drawTree(float x, float z) {
    const float trunkHeight = 6.0f;
    const float trunkRadius = 0.5f;
    const float foliageHeight = 5.0f;
    const float foliageRadius = 2.5f;
    const float baseY = 0.01f;

    // Draw trunk
    glColor3f(0.55f, 0.27f, 0.07f);
    glPushMatrix();
    glTranslatef(x, baseY, z);
    glRotatef(-90, 1, 0, 0);
    gluCylinder(quad, trunkRadius, trunkRadius, trunkHeight, 20, 4);
    glPopMatrix();

    // Draw foliage
    glColor3f(0.0f, 0.5f, 0.0f);
    glPushMatrix();
    glTranslatef(x, baseY + trunkHeight, z);
    glRotatef(-90, 1, 0, 0);
    glutSolidCone(foliageRadius, foliageHeight, 20, 20);
    glPopMatrix();
}

// Draw moon as a sphere
void drawMoon() {
    glColor3f(1.0f, 1.0f, 0.8f);
    glPushMatrix();
    glTranslatef(-30.0f, 50.0f, -50.0f);
    glutSolidSphere(5.0f, 30, 30);
    glPopMatrix();
}

// Draw stars as points in the sky
void drawStars() {
    glColor3f(1.0f, 1.0f, 1.0f);
    glPointSize(2.0f);
    glBegin(GL_POINTS);

    // Star positions
    float stars[30][3] = {
        {-45, 52, -60}, {-25, 55, -40}, {-5, 53, -65},  {15, 54, -50},  {35, 56, -70},
        {-50, 58, -35}, {-30, 51, -55}, {-10, 57, -75}, {10, 50, -60},  {30, 55, -45},
        {-60, 59, -50}, {-40, 48, -70}, {-20, 56, -30}, {0, 52, -40},   {20, 58, -68},
        {-55, 50, -60}, {-35, 53, -42}, {-15, 49, -58}, {5, 51, -72},   {25, 57, -35},
        {45, 54, -65},  {-38, 59, -48}, {-18, 50, -36}, {2, 56, -55},   {22, 49, -70},
        {-48, 52, -38}, {-28, 55, -60}, {-8, 50, -30},  {12, 58, -44},  {32, 53, -66}
    };

    // Draw main stars
    for (int i = 0; i < 30; ++i) {
        glVertex3f(stars[i][0], stars[i][1], stars[i][2]);
    }
    // Draw extra stars for effect
    for (int i = 0; i < 30; ++i) {
        glVertex3f(stars[i][0], stars[i][1] - 20, stars[i][2]);
        glVertex3f(stars[i][0] + 60, stars[i][1] - 20, stars[i][2]);
        glVertex3f(stars[i][0] - 60, stars[i][1] - 20, stars[i][2]);
        glVertex3f(stars[i][0] + 60, stars[i][1], stars[i][2]);
        glVertex3f(stars[i][0] - 60, stars[i][1], stars[i][2]);
    }
    glEnd();
}

// Draw lamp post with glowing lamp
void drawLampPost() {
    float baseX = 2.0f;
    float baseZ = 20.0f;
    float baseY = 0.01f;

    float postHeight = 12.0f;
    float postRadius = 0.3f;
    float lampRadius = 1.2f;

    // Draw post
    glColor3f(0.2f, 0.2f, 0.2f);
    glPushMatrix();
    glTranslatef(baseX, baseY, baseZ);
    glRotatef(-90, 1, 0, 0);
    gluCylinder(quad, postRadius, postRadius, postHeight, 20, 4);
    glPopMatrix();

    // Draw lamp (glowing sphere)
    glColor3f(1.0f, 1.0f, 0.6f);
    glPushMatrix();
    glTranslatef(baseX, baseY + postHeight + lampRadius, baseZ);
    glutSolidSphere(lampRadius, 30, 30);
    glPopMatrix();

    // Draw horizontal arm
    glColor3f(0.2f, 0.2f, 0.2f);
    glPushMatrix();
    glTranslatef(baseX, baseY + postHeight * 0.7f, baseZ);
    glRotatef(0, 0, 0, 0);
    glBegin(GL_QUADS);
    float armLength = 2.0f;
    float armWidth = 0.2f;
    glVertex3f(0, 0, -armWidth);
    glVertex3f(armLength, 0, -armWidth);
    glVertex3f(armLength, 0, armWidth);
    glVertex3f(0, 0, armWidth);
    glEnd();
    glPopMatrix();
}

// Draw shooting star if active
void drawShootingStar() {
    if (!star.active) return;

    glColor3f(1.0f, 1.0f, 0.8f); // bright yellow-white
    glPointSize(5.0f);
    glBegin(GL_POINTS);
    glVertex3f(star.x, star.y, star.z);
    glEnd();

    // Draw trailing line
    glBegin(GL_LINES);
    glVertex3f(star.x, star.y, star.z);
    glVertex3f(star.x - star.dx * 3, star.y - star.dy * 3, star.z - star.dz * 3);
    glEnd();
}

// Keyboard handler for shooting star
void handleKeypress(unsigned char key, int x, int y) {
    switch (key) {
    case 's':
    case 'S':
        if (!star.active) {
            // Starting position
            star.x = -60.0f;
            star.y = 60.0f;
            star.z = -60.0f;

            // Movement direction
            star.dx = 1.5f;
            star.dy = -0.7f;
            star.dz = 1.0f;

            star.life = 80;
            star.active = true;
        }
        break;
    }
}

// Main display function: draws the entire scene
void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glLoadIdentity();

    // Set camera position and orientation
    gluLookAt(
        0.0, 15.0, 40.0,  // Eye position
        0.0, 0.0, 0.0,    // Look at center
        0.0, 1.0, 0.0     // Up vector
    );

    // Update light positions
    GLfloat moonPos[] = { -30.0f, 50.0f, -50.0f, 1.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, moonPos);

    GLfloat lampPos[] = { 2.0f, 13.2f, 20.0f, 1.0f };
    glLightfv(GL_LIGHT1, GL_POSITION, lampPos);

    // Draw all scene objects
    drawGround();
    drawPond();
    drawStones();
    drawLotusBud();
    drawFrog(frogX, frogY, frogZ);
    drawTree(-10.0f, 20.0f);
    drawTree(-30.0f, -25.0f);
    drawTree(-20.0f, 30.0f);
    drawTree(-40.0f, 10.0f);
    drawTree(-15.0f, 25.0f);
    drawTree(35.0f, 10.0f);
    drawTree(30.0f, -45.0f);
    drawTree(-40.0f, -25.0f);
    drawMoon();
    drawStars();
    drawLampPost();
    drawShootingStar();

    glFlush();
}

// Window reshape handler: adjusts viewport and perspective
void reshape(int width, int height) {
    if (height == 0) height = 1;
    float aspect = (float)width / (float)height;

    glViewport(0, 0, width, height);

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(90.0, aspect, 0.5, 1000.0);

    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
}

// Main function: GLUT setup and main loop
int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(800, 600);
    glutCreateWindow("Pond scene");

    init();

    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutTimerFunc(0, update, 0);
    glutKeyboardFunc(handleKeypress);

    glutMainLoop();
    return 0;
}
